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
    app.renderer.resize(500, 500);
    containerElement.appendChild(app.canvas);
    app.canvas.style.height = 'auto'

    
    // Make canvas full size after all
    // app.renderer.resize(window.innerWidth, window.innerHeight);

    const gridManager = new GridManager(app)
    function update() {
      gridManager.update()

      requestAnimationFrame(update)
    }
    update()

    // Add resize listener
    // window.addEventListener('resize', () => {
    //   app.renderer.resize(window.innerWidth, window.innerHeight);
    //   gridManager.resize()
    // });
}

init()





