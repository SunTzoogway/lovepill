import * as PIXI from 'pixi.js';
import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import { lineIntersectCircle } from './LineCircleIntersection.js'
window.PIXI = PIXI

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

let app
const COLORS = {
    red: 0x990012,
    pink: 0xFFB7C5
}

export class GridManager {
    constructor(app_) {
        app = app_
        this.points = []
        this.app = app

        this.setupGrid()   
        const lineDrawing = new LineDrawing()
        this.lineDrawing = lineDrawing
        app.stage.hitArea = app.screen;

        app.stage.on('pointerdown', (e) => {      
            // let position = this.getPointerPosition(e)
            let position = lineDrawing.pointerPosition
            if (e.target.isCircle) {
                position = e.target.toGlobal(new PIXI.Point())
            }
            // if it's NOT a circle and this is the first point REJECT
            if (lineDrawing.points.length == 0 && !e.target.isCircle) {
                return
            }

            // TODO: instead of pointer position, use the snapped position

            if (e.data.pointerType != 'mouse') {
                if (lineDrawing.points == 0) {
                    lineDrawing.pushPoint(position.x, position.y)
                    this.updateCompletedPoints()
                } else {

                }
            } else {
                lineDrawing.pushPoint(position.x, position.y)
                this.updateCompletedPoints()
            }
        })
        app.stage.eventMode = 'static'
        app.stage.on('pointerup', (e) => {
            if (e.data.pointerType != 'mouse') {
                // push last position
                const position = lineDrawing.pointerPosition
                lineDrawing.pushPoint(position.x, position.y)
                this.updateCompletedPoints()
            }
        })

        function distance(p1, p2) {
            const xdiff = p1.x - p2.x 
            const ydiff = p1.y - p2.y 
            return Math.sqrt(Math.pow(xdiff, 2) + Math.pow(ydiff, 2))
        }


        
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
                            intersectedPoints.push(circlePosition)
                        } 
                    }
                }
            }

            lineDrawing.pointerPosition = this.getPointerPosition(e)
            if (intersectedPoints.length > 0) {
                const lastPoint = intersectedPoints.pop()

                const p0 = lineDrawing.points[lineDrawing.points.length - 1]
                const pTarget = lineDrawing.pointerPosition
                const pDirection = lastPoint

                const targetDx = pTarget.x - p0.x;
                const targetDy = pTarget.y - p0.y;
                const desiredMagnitude = Math.sqrt(targetDx * targetDx + targetDy * targetDy);

                const directionDx = pDirection.x - p0.x;
                const directionDy = pDirection.y - p0.y;

                const directionMagnitude = Math.sqrt(directionDx * directionDx + directionDy * directionDy);
                const normalizedDx = directionDx / directionMagnitude;
                const normalizedDy = directionDy / directionMagnitude;
    
                lineDrawing.pointerPosition = {
                    x: p0.x + normalizedDx * desiredMagnitude,
                    y: p0.y + normalizedDy * desiredMagnitude
                }
                
                linePoints = [...lineDrawing.points, lineDrawing.pointerPosition]
                for (let circleNode of this.points) {
                    p1 = linePoints[linePoints.length - 1]
                    p2 = linePoints[linePoints.length - 2]

                    const bool = circleNode.intersectsLine(p1, p2)                    
                    circleNode.setHighlighted(bool)
                }

                
            }
        })
    }

    update() {
        const { lineDrawing } = this
        lineDrawing.update()
    }

    ///// 

    updateCompletedPoints() {
        const { lineDrawing } = this

        console.log("Drawing length", lineDrawing.points.length)
        const linePoints = lineDrawing.points
        if (linePoints.length < 2) return

        const p1 = linePoints[linePoints.length - 1]
        const p2 = linePoints[linePoints.length - 2]

        let winCount = 0

        for (let circleNode of this.points) {
            const bool = circleNode.intersectsLine(p1, p2) 
            if (bool) {
                circleNode.markComplete(bool)
            }      
            
            if (circleNode.isHighlighted) winCount ++
        }

        // Check for win condition
        console.log(winCount, this.points.length)
    }

    setupGrid() {
        const { app } = this
        const gridContainer = new PIXI.Container();
        app.stage.addChild(gridContainer);
        const spacing = 100
        const GRID_SIZE = 3
        const totalWidth = spacing * (GRID_SIZE - 1);
        const totalHeight = spacing * (GRID_SIZE - 1);

        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const x = col * spacing - totalWidth / 2;
                const y = row * spacing - totalHeight / 2;
                const node = new PointNode(x, y)
                gridContainer.addChild(node.circle);
                this.points.push(node)
            }
        }

        gridContainer.x = app.renderer.width / 2;
        gridContainer.y = app.renderer.height / 2;

        this.gridContainer = gridContainer
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
        
        this.points = []
        this.line = line
        this.pointerPosition = null
        this.width = LineDrawing.width
    }

    pushPoint(x, y) {
        if (this.points.length == 4) {
            // TODO check win condition
            // if fail, disappear line & start over
            this.fadeOutLine()
            return
        }

        this.points.push({ x, y })        
    }
    
    fadeOutLine() {
        const oldLine = this.line
        gsap.to(this.line, {
            duration: 5,
            pixi: { alpha: 0 },
            onComplete: () => {
                oldLine.destroy()
            }
        });

        this.line = new PIXI.Graphics()
        app.stage.addChild(this.line)
        this.points = []
    }

    update() {
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
}

class PointNode {
    constructor(x, y) {
        const circle = new PIXI.Graphics();
        this.circle = circle
        circle.x = x 
        circle.y = y
        circle.isCircle = true
        this.hitAreaRadius = 20
        this.visualRadius = 7
        circle.hitArea = new PIXI.Circle(0, 0, this.hitAreaRadius)
        this.setHighlighted(false)

        // circle.on('mouseover', () => {
        //     this.setHighlighted(true)
        // })
        circle.eventMode = 'static'
        return this
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

        const { circle } = this
        circle.clear()
        circle.circle(0, 0, this.visualRadius)
        if (bool) {
            circle.fill(COLORS.pink)
            circle.stroke({ color: COLORS.red, width: 2 })

        } else {
            circle.fill(COLORS.red)
        }
        
    }
}