import * as PIXI from 'pixi.js';
import { sound } from '@pixi/sound';
import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import { lineIntersectCircle } from './LineCircleIntersection.js'
import { snapToAngle } from './snapToAngle.js'
window.PIXI = PIXI
window.pixiSound = sound;

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

let app
const COLORS = {
    red: 0x990012,
    pink: 0xFFB7C5
}
const GRID_OPTIONS = { spacing: 100, size: 3 }
const SNAP_RADIUS = 35
let IS_DONE = false

// Initialize sound system after user interaction
function initSound() {
    return new Promise((resolve) => {
        // Add sounds to library
        sound.add('line1', 'lovepill/public/1.wav');
        sound.add('line2', 'lovepill/public/2.wav');
        sound.add('line3', 'lovepill/public/3.wav');
        sound.add('line4', 'lovepill/public/4.wav');
        sound.add('line5', 'lovepill/public/5.wav');
        sound.add('error', 'lovepill/public/error.wav');  // Add error sound
        
        const resumeAudio = async () => {
            // Use sound.unmuteAll() instead of context.resume()
            sound.unmuteAll();
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('touchstart', resumeAudio);
            console.log('Audio resumed');
            resolve();
        };
        
        // Always attach the listeners
        document.addEventListener('click', resumeAudio);
        document.addEventListener('touchstart', resumeAudio);
        
        // If sound is already enabled, resolve immediately
        if (!sound.muted) {
            resolve();
        }
    });
}

export class GridManager {
    constructor(app_) {
        app = app_
        this.points = []
        this.app = app
        this.soundInitialized = false
        
        // Add this line to make GridManager accessible globally
        window.gridManager = this

        // Initialize sound system
        initSound().then(() => {
            this.soundInitialized = true;
            console.log('Sound system ready');
        });

        this.setupGrid()   
        const lineDrawing = new LineDrawing()
        this.lineDrawing = lineDrawing

        const marker = new PIXI.Graphics();
        marker.circle(0, 0, 5)
        marker.fill(0x00ff00)
        // app.stage.addChild(marker)
        

        // On mouse click OR touch
        app.stage.hitArea = app.screen;
        app.stage.eventMode = 'static'
        app.stage.on('pointerdown', (e) => {      
            // Take the current line end point, not touch position,
            // to account for snapping 
            let position = lineDrawing.pointerPosition
            if (lineDrawing.pointerPosition == null) {
                position = { x: e.global.x, y: e.global.y }
            }
            if (e.target.isCircle) {
                // if you tap on/near a circle, snap to it but 
                // without changing direction of the line
                const circlePosition = e.target.toGlobal(new PIXI.Point())
                const currentLineAngle = lineDrawing.getAngle()
                if (currentLineAngle == null) {
                    position = circlePosition
                } else {
                    position = snapToAngle(position, circlePosition, currentLineAngle)
                }
            }
            // if it's NOT a circle and this is the first point REJECT
            if (lineDrawing.points.length == 0 && !e.target.isCircle) {
                return
            }

            // Check if point is close enough to somewhere on the grid to snap
            const closestGridPoint = computeClosestGridPoint(position)
            const dist = distance(closestGridPoint, position)
            if (dist <= SNAP_RADIUS) {
                position = closestGridPoint
            }
            marker.x = closestGridPoint.x
            marker.y = closestGridPoint.y

            if (e.data.pointerType != 'mouse') {
                // for mouse, add points on every click
                // but for touch, only add on the first tap
                // after that, you add on release
                if (lineDrawing.points == 0) {
                    lineDrawing.pushPoint(position.x, position.y)
                    this.updateCompletedPoints()
                }
            } else {
                lineDrawing.pushPoint(position.x, position.y)
                this.updateCompletedPoints()
            }
        })
        app.stage.on('pointerup', (e) => {
            if (e.data.pointerType != 'mouse') {
                // if it's NOT a circle and this is the first point REJECT
                if (lineDrawing.points.length == 0 && !e.target.isCircle) {
                    return
                }
                
                let position = lineDrawing.pointerPosition
                if (!position) {
                    return // Exit if no line is being drawn
                }

                // Check if point is close enough to somewhere on the grid to snap
                const closestGridPoint = computeClosestGridPoint(position)
                const dist = distance(closestGridPoint, position)
                if (dist <= SNAP_RADIUS) {
                    position = closestGridPoint
                }

                // Get the previous point to check line length
                const prevPoint = lineDrawing.points[lineDrawing.points.length - 1]
                if (prevPoint) {
                    const length = lineLength(prevPoint, position)
                    // Only accept the line if it's longer than 2 circle radii
                    // (using the hitAreaRadius which is 20)
                    if (length <= 40 && lineDrawing.points.length === 1) {
                        // Reset everything if it's the first point and line is too short
                        lineDrawing.reset()
                        this.resetPointsCompletionState()
                        return
                    } else if (length <= 40) {
                        return // Line too short, don't accept it
                    }
                }

                lineDrawing.pushPoint(position.x, position.y)
                this.updateCompletedPoints()
            }
        })


        app.stage.on('pointermove', (e) => {      
            

            // check if line intersects any points  
            let linePoints = [...lineDrawing.points, this.getPointerPosition(e)]
            let intersectedPoints = []
            let p1; let p2;

            if (linePoints.length >= 2) {
                p1 = linePoints[linePoints.length - 2]
                p2 = linePoints[linePoints.length - 1]


                for (let circleNode of this.points) {
                    const bool = circleNode.intersectsLine(p1, p2)
                    circleNode.setHighlighted(bool)
                    if (bool) {
                        const circlePosition = circleNode.circle.toGlobal(new PIXI.Point())
                        // ignore point if it's the starting point 
                        const dist = distance(p1, circlePosition)
                        if (dist > 20) {
                            intersectedPoints.push({circlePosition, dist})
                        } 
                    }
                }
            }

            intersectedPoints.sort((a, b) => a.dist - b.dist)

            lineDrawing.pointerPosition = this.getPointerPosition(e)
            
        })
    }

    update() {
        const { lineDrawing } = this
        lineDrawing.update()
    }

    ///// 

    resetPointsCompletionState() {
        for (let circleNode of this.points) {
            circleNode.markComplete(false)
            circleNode.setHighlighted(false)
        }
    }

    async updateCompletedPoints() {
        const { lineDrawing } = this

        console.log("Drawing length", lineDrawing.points.length)
        const linePoints = lineDrawing.points
        if (linePoints.length < 2) return

        const p1 = linePoints[linePoints.length - 1]
        const p2 = linePoints[linePoints.length - 2]

        let winCount = 0

        // Re-check all points, if they are intersected by line, mark as complete
        for (let circleNode of this.points) {
            const bool = circleNode.intersectsLine(p1, p2) 
            if (bool) {
                circleNode.markComplete(bool)
            }      
            if (circleNode.isHighlighted) winCount ++
        }
    
        // Check for win condition
        console.log('winCount', winCount, 'this.points.length', this.points.length)

        if (linePoints.length == 5) {
            if (winCount != 9) {
                // Play error sound
                if (this.soundInitialized && !sound.muted) {
                    sound.play('error');
                }
                // if we did NOT win, fade out line & start over
                lineDrawing.fadeOutLine()
                this.resetPointsCompletionState()
            } else {
                IS_DONE = true
                lineDrawing.markLineComplete()
                
                // Play winning sound
                if (this.soundInitialized && !sound.muted) {
                    sound.play('line5');
                }
                
                await sleep(1000)
                await this.fadeOutGrid()
                await sleep(1000)
                await lineDrawing.fadeOutLine()
                window.location.href = 'home.html?fadeIn'
            }
        }

        // Play sound based on new line length
        const lineLength = lineDrawing.points.length;
        if (lineLength >= 1 && lineLength <= 5) {
            if (this.soundInitialized && !sound.muted) {
                console.log(`Playing sound: line${lineLength}`);
                sound.play(`line${lineLength}`);
            }
        }
    }

    setupGrid() {
        const { app } = this
        const gridContainer = new PIXI.Container();
        app.stage.addChild(gridContainer);
        const spacing = GRID_OPTIONS.spacing
        const GRID_SIZE = GRID_OPTIONS.size
        const totalWidth = spacing * (GRID_SIZE - 1);
        const totalHeight = spacing * (GRID_SIZE - 1);

        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const x = col * spacing - totalWidth / 2;
                const y = row * spacing - totalHeight / 2;
                const node = new PointNode(x, y, gridContainer)
                this.points.push(node)
            }
        }


        gridContainer.x = app.renderer.width / 2;
        gridContainer.y = app.renderer.height / 2;

        this.gridContainer = gridContainer
    }

    fadeOutGrid() {
        return new Promise((resolve) => {
            gsap.to(this.gridContainer, {
                duration: 2.0,
                pixi: { alpha: 0 },
                onComplete: resolve
            });
        })
        
    }

    resize() {
        this.gridContainer.x = app.renderer.width / 2;
        this.gridContainer.y = app.renderer.height / 2;
    }

    getPointerPosition(e) {
        return { x: e.global.x, y: e.global.y }
    }
}

class LineDrawing {
    static width = 3

    constructor() {
        const line = new PIXI.Graphics()
        app.stage.addChild(line)
        line.eventMode = 'none';

        
        this.points = []
        this.line = line
        this.pointerPosition = null
        this.width = LineDrawing.width
    }

    getAngle() {
        if (this.points.length == 0) return null 

        const lastPoint = this.points[this.points.length - 1]
        const dy = this.pointerPosition.y - lastPoint.y
        const dx = this.pointerPosition.x - lastPoint.x

        return Math.atan2(dy, dx)
    }

    pushPoint(x, y) {
        if (IS_DONE) return 
        if (this.points.length >= 5) return 

        this.points.push({ x, y })    
        this.pointerPosition = null    

        // Play sound when first point is placed
        if (this.points.length === 1) {
            if (window.gridManager && window.gridManager.soundInitialized && !sound.muted) {
                console.log('Playing sound: line1');
                sound.play('line1');
            }
        }
    }

    markLineComplete() {
        const { points, line, width } = this

        line.clear()
        line.moveTo(points[0].x, points[0].y)

        for (let i = 1; i < points.length; i++) {
            line.lineTo(points[i].x, points[i].y)
        }

           
        line.stroke({ width, color: COLORS.pink, pixelLine: false })
    }
    
    fadeOutLine() {
        return new Promise((resolve) => {

            const oldLine = this.line
            gsap.to(this.line, {
                duration: 2.0,
                pixi: { alpha: 0 },
                onComplete: () => {
                    oldLine.destroy()
                    resolve()
                }
            });

            this.line = new PIXI.Graphics()
            app.stage.addChild(this.line)
            this.points = []
        })
    }

    update() {
        if (this.points.length >= 5) {
            return
        }

        const { points, line, width } = this
        if (points.length > 0) {
            line.clear()
            line.moveTo(points[0].x, points[0].y)

            for (let i = 1; i < points.length; i++) {
                line.lineTo(points[i].x, points[i].y)
            }

            if (this.pointerPosition) {
                line.lineTo(this.pointerPosition.x, this.pointerPosition.y)
            }

            line.stroke({ width, color: COLORS.red, pixelLine: false })
        }
    }

    reset() {
        this.points = []
        this.line.clear()
        this.pointerPosition = null
    }
}

class PointNode {
    constructor(x, y, container) {
        this.container = container
        const circle = new PIXI.Graphics();
        container.addChild(circle)
        this.circle = circle
        circle.x = x 
        circle.y = y
        circle.isCircle = true
        this.hitAreaRadius = 20
        this.visualRadius = 7
        circle.hitArea = new PIXI.Circle(0, 0, this.hitAreaRadius)

        this.createGlow()
    
        this.setHighlighted(false)

        circle.eventMode = 'static'
        circle.cursor = 'pointer';
        return this
    }

    createGlow() {
        const blurFilter = new PIXI.BlurFilter({
            strength: 0,
            quality: 4
        });

        const glowCircle = new PIXI.Graphics();
        glowCircle.circle(0, 0, this.visualRadius);
        glowCircle.fill(COLORS.red);
        glowCircle.filters = [blurFilter];
        this.blurFilter = blurFilter
        this.container.addChild(glowCircle)
        glowCircle.x = this.circle.x; glowCircle.y = this.circle.y;
        this.glowCircle = glowCircle

        glowCircle.eventMode = 'none'

        // Create the cycle timeline for hover
        const glowCycleTimeline = gsap.timeline({ paused: true, repeat: -1  })
            .to(blurFilter, {
                strength: 15,
                duration: 1,
                ease: "power2.inout"
            })
            .to(blurFilter, {
                strength: 1,
                duration: 1,
                ease: "power2.inout"
            });

        this.circle.on('pointerenter', () => {
            if (!glowCycleTimeline.isActive()) {
                glowCycleTimeline.play(0);
            }
           
            glowCycleTimeline.repeat(-1)
        })
        this.circle.on('pointerleave', () => {
            glowCycleTimeline.repeat(0)
        })
    }

    intersectsLine(p1, p2) {
        const circlePosition = this.circle.toGlobal(new PIXI.Point())
        const circle = { 
            x: circlePosition.x,
            y: circlePosition.y,
            radius: this.visualRadius
        } 
       return lineIntersectCircle([p1, p2], LineDrawing.width, circle)
    }

    markComplete(bool) {
        this.isComplete = bool 
        this.setHighlighted(bool)
    }

    setHighlighted(bool) {
        if (bool == false && this.isComplete) return 

        this.isHighlighted = bool

        const { circle, glowCircle } = this
        circle.clear(); 
        glowCircle.clear()
        circle.circle(0, 0, this.visualRadius); 
        glowCircle.circle(0, 0, this.visualRadius); 
        if (bool) {
            circle.fill(COLORS.pink)
            // circle.stroke({ color: COLORS.red, width: 2 })

            glowCircle.fill(COLORS.pink)
        } else {
            circle.fill(COLORS.red)
            glowCircle.fill(COLORS.red)
        }
        
    }
}

function distance(p1, p2) {
    const xdiff = p1.x - p2.x 
    const ydiff = p1.y - p2.y 
    return Math.sqrt(Math.pow(xdiff, 2) + Math.pow(ydiff, 2))
}
function computeClosestGridPoint(point) {
    const screenCenterX = app.renderer.width / 2;
    const screenCenterY = app.renderer.height / 2;
    const spacing = GRID_OPTIONS.spacing
    
    const x = Math.round((point.x - screenCenterX) / spacing) * spacing + screenCenterX
    const y = Math.round((point.y - screenCenterY) / spacing) * spacing + screenCenterY

    return { x, y }
}

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

function lineLength(p1, p2) {
    return distance(p1, p2)
}
