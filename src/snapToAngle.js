export function snapToAngle(currentPoint, snapToPoint, angle) {
    const x2 = currentPoint.x 
    const y2 = currentPoint.y

    const xT = snapToPoint.x 
    const yT = snapToPoint.y
    // Create unit vector for our fixed angle
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    
    // Vector from line endpoint to target point
    const dx = xT - x2;
    const dy = yT - y2;
    
    // Project this vector onto our direction vector
    // dot product: (dx,dy) · (directionX,directionY)
    const projection = dx * directionX + dy * directionY;
    
    // New endpoint coordinates
    const x3 = x2 + directionX * projection;
    const y3 = y2 + directionY * projection;
    
    return { x: x3, y: y3 };
}