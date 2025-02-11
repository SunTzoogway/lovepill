import * as PIXI from 'pixi.js';
import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import { lineIntersectCircle } from './LineCircleIntersection.js'
import { snapToAngle } from './snapToAngle.js'
window.PIXI = PIXI

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

let app
const COLORS = {
    red: 0x990012,
    pink: 0xFFB7C5
}
const GRID_OPTIONS = { spacing: 100, size: 3 }

export class GridManager {
    constructor(app_) {
        app = app_
        this.points = []
        this.app = app

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
            if (dist <= 40) {
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

                // Check if point is close enough to somewhere on the grid to snap
                const closestGridPoint = computeClosestGridPoint(position)
                const dist = distance(closestGridPoint, position)
                if (dist <= 40) {
                    position = closestGridPoint
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
            if (intersectedPoints.length > 0) {
                const lastPoint = (intersectedPoints.pop()).circlePosition

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
        const spacing = GRID_OPTIONS.spacing
        const GRID_SIZE = GRID_OPTIONS.size
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

    getAngle() {
        if (this.points.length == 0) return null 

        const lastPoint = this.points[this.points.length - 1]
        const dy = this.pointerPosition.y - lastPoint.y
        const dx = this.pointerPosition.x - lastPoint.x

        return Math.atan2(dy, dx)
    }

    pushPoint(x, y) {
        if (this.points.length == 4) {
            // TODO check win condition
            // if fail, disappear line & start over
            this.fadeOutLine()
            return
        }

        this.points.push({ x, y })    
        this.pointerPosition = null    
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