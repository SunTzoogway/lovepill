import { Application, Assets, Sprite } from 'pixi.js';
import * as PIXI from 'pixi.js';

let app;
let hearts = []
let heartTexture
let brokenHeartTexture

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

async function init() {
    // Create a new application
    app = new Application();

    // Initialize the application
    await app.init({ background: 'white', antialias: true });
    document.querySelector('#pixi-container').appendChild(app.canvas);

    
    brokenHeartTexture = await Assets.load('./broken.png');
    heartTexture = await Assets.load('./heart.png');
    
    // heartTexture.source.antialias = true
    heartTexture.source.autoGenerateMipmaps = true 
    brokenHeartTexture.source.autoGenerateMipmaps = true 
    // heartTexture.source.scaleMode = 'linear' // or nearest

    app.ticker.add((time) => {
        
    });

    createSpriteGrid()

    // for (let heart of hearts) {
    //   heart.texture = heartTexture
    // }
}

init()



  function createSpriteGrid() {
    // Create container for the grid
    const gridContainer = new PIXI.Container();
    const spacing = 100
    const GRID_SIZE = 3

    // Calculate total grid width and height
    const totalWidth = spacing * (GRID_SIZE - 1);
    const totalHeight = spacing * (GRID_SIZE - 1);

    
    // Create sprites
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
          const texture = brokenHeartTexture
          const sprite = new PIXI.Sprite(texture);
          sprite.on('pointerdown', function(e) {
            sprite.texture = heartTexture
          });
          sprite.cursor = 'pointer'
          sprite.eventMode = 'static'
          
          // Center anchor point
          sprite.anchor.set(0.5);
          
          // Position sprite
          sprite.x = col * spacing - totalWidth / 2;
          sprite.y = row * spacing - totalHeight / 2;
          
          // Optional: scale sprite if needed
          sprite.scale.set(0.08);
          hearts.push(sprite)
          
          // Add to container
          gridContainer.addChild(sprite);
      }
  }
  
  // Center the entire grid container
  gridContainer.x = DEFAULT_WIDTH / 2;
  gridContainer.y = DEFAULT_HEIGHT / 2;
  
  // Add container to stage
  app.stage.addChild(gridContainer);
    
    return gridContainer;
}






function resize() {

  const scale = Math.min(
      window.innerWidth / DEFAULT_WIDTH,
      window.innerHeight / DEFAULT_HEIGHT
  );

  const newWidth = Math.round(DEFAULT_WIDTH * scale);
  const newHeight = Math.round(DEFAULT_HEIGHT * scale);

  app.renderer.resize(newWidth, newHeight);
  app.stage.scale.x = scale;
  app.stage.scale.y = scale;

  // Center the stage
  app.stage.position.x = newWidth / 2 - (DEFAULT_WIDTH / 2 * scale);
  app.stage.position.y = newHeight / 2 - (DEFAULT_HEIGHT / 2 * scale);
}

// window.addEventListener('resize', resize);
