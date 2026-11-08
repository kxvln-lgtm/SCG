// Each route owns its observer, animations and listeners.
let dispose = () => {};
export function clearExperience() { dispose(); dispose = () => {}; }
export function mountExperience() {
  clearExperience();
  const root = document.querySelector('#app');
  if (!root) return;
  const controller = new AbortController(), animations = new Set();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let observer;
  if (!reduced.matches && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        const motion = entry.target.animate?.(
          [{opacity:.25,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}],
          {duration:600,easing:'cubic-bezier(.2,.7,.2,1)'}
        );
        if (motion) { animations.add(motion); motion.finished.then(()=>animations.delete(motion)).catch(()=>{}); }
        observer.unobserve(entry.target);
      }
    }, {threshold:.08});
    root.querySelectorAll('.public-section,.join-band').forEach(el=>observer.observe(el));
  }
  const scene=root.querySelector('#hero-scene'),button=scene?.querySelector('[data-motion-toggle]');
  button?.addEventListener('click',()=>{
    const paused=scene.classList.toggle('motion-paused');
    button.setAttribute('aria-pressed',String(paused));
    button.setAttribute('aria-label',paused?'Продолжить анимацию':'Остановить анимацию');
    button.firstElementChild.textContent=paused?'▷':'Ⅱ';
  },{signal:controller.signal});
  const maze=root.querySelector('[data-maze-video]'),mazeButton=root.querySelector('[data-maze-motion]');
  let mazeObserver;
  const updateMaze=()=>{
    const playing=Boolean(maze&&!maze.paused&&!maze.ended);
    maze?.classList.toggle('is-playing',playing);
    mazeButton?.setAttribute('aria-pressed',String(playing));
    mazeButton?.setAttribute('aria-label',playing?'Остановить видео лабиринта':'Запустить видео лабиринта');
    if(mazeButton?.firstElementChild)mazeButton.firstElementChild.textContent=playing?'Ⅱ':'▷';
  };
  const startMaze=async()=>{
    if(!maze||!maze.isConnected)return;
    if(!maze.querySelector('source').src){maze.querySelector('source').src=maze.querySelector('source').dataset.src;maze.load();}
    try{await maze.play();}catch{updateMaze();}
  };
  for(const name of ['play','pause','ended','error'])maze?.addEventListener(name,updateMaze,{signal:controller.signal});
  mazeButton?.addEventListener('click',()=>{if(maze.paused)startMaze();else maze.pause();},{signal:controller.signal});
  if(maze&&!reduced.matches&&'IntersectionObserver' in window){
    mazeObserver=new IntersectionObserver(entries=>{if(entries[0].isIntersecting){startMaze();mazeObserver.disconnect();}},{threshold:.2});
    mazeObserver.observe(maze);
  }
  const stopMotion=()=>{if(reduced.matches){animations.forEach(a=>a.cancel());animations.clear();observer?.disconnect();maze?.pause();mazeObserver?.disconnect();}};
  reduced.addEventListener('change',stopMotion,{signal:controller.signal});
  dispose=()=>{controller.abort();observer?.disconnect();mazeObserver?.disconnect();maze?.pause();animations.forEach(a=>a.cancel());};
}
