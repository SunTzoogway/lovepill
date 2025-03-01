import * as PIXI from 'pixi.js';
import { GridManager  } from './GridManager';
import { sound } from '@pixi/sound';

/*

prototype: https://claude.site/artifacts/457878a7-91f3-448d-8689-eaddea499c43

*/

// Define the background color in one place so it's consistent
const BG_COLOR = 0xFAF9F6;
const BG_COLOR_HEX = '#FAF9F6';

// Create and load sounds before init
async function preloadSounds() {
    return Promise.all([
        sound.add('line1', '/1.wav'),
        sound.add('line2', '/2.wav'),
        sound.add('line3', '/3.wav'),
        sound.add('line4', '/4.wav'),
        sound.add('line5', '/5.wav'),
        sound.add('error', '/Error.wav')
    ]);
}

async function init() {
    // Set HTML background color
    document.body.style.backgroundColor = BG_COLOR_HEX;
    document.body.style.margin = '0';  // Remove default margins

    // Wait for sounds to load before continuing
    await preloadSounds();
    console.log('Sounds preloaded');

    const containerElement = document.querySelector('#pixi-container')

    const app = new PIXI.Application();
    await app.init({ 
      backgroundColor: BG_COLOR,  // Set PIXI background color
      antialias: true, 
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    containerElement.appendChild(app.canvas);

    const gridManager = new GridManager(app)
    function update() {
      gridManager.update()

      requestAnimationFrame(update)
    }
    update()

    // Add resize listener
    window.addEventListener('resize', handleResize);
    handleResize()
    function handleResize() {
        if (window.innerWidth < 500) {
            // Small screen: fixed width with auto height
            app.renderer.resize(500, 500);
            app.canvas.style.height = 'auto';
        } else {
            // Large screen: full width and height
            app.renderer.resize(window.innerWidth, window.innerHeight);
            app.canvas.style.height = '100%';
        }
  
        if(gridManager) gridManager.resize();
    }
}

init()





