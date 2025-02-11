export function lineIntersectCircle(
    line, 
    lineThickness,
    circle
) {
    const x1 = line[0].x 
    const y1 = line[0].y 
    const x2 = line[1].x 
    const y2 = line[1].y 

    const circleX = circle.x 
    const circleY = circle.y 
    const circleRadius = circle.radius
    
    
    // Helper function: Distance between point and line segment
    function distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;

        return Math.sqrt(dx * dx + dy * dy);
    }

    // The effective radius is the sum of the circle's radius and half the line thickness
    const effectiveRadius = circleRadius + lineThickness / 2;

    // Get the distance from the circle's center to the line segment
    const distance = distanceToLineSegment(circleX, circleY, x1, y1, x2, y2);

    // If the distance is less than the effective radius, they intersect
    return distance <= effectiveRadius;
}
