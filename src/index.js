import * as PIXI from 'pixi.js';
import { GridManager  } from './GridManager';

/*

prototype: https://claude.site/artifacts/457878a7-91f3-448d-8689-eaddea499c43

*/

async function init() {
    const containerElement = document.querySelector('#pixi-container')

    const app = new PIXI.Application();
    await app.init({ 
      background: 'white',
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





