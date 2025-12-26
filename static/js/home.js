function spark(canvasId){
  const c = document.getElementById(canvasId);
  const g = c.getContext("2d");

  function draw(){
    const w = c.width = c.parentElement.clientWidth;
    const h = c.height = 120;

    g.clearRect(0,0,w,h);
    g.globalAlpha = 0.35;
    g.strokeStyle = "white";
    g.beginPath();

    let x = 0;
    let y = h/2;
    g.moveTo(0,y);

    for(let i=0;i<40;i++){
      x = (w/40)*i;
      y = (h/2) + (Math.sin(Date.now()/500 + i)*18) + (Math.random()*6-3);
      g.lineTo(x,y);
    }
    g.stroke();
    requestAnimationFrame(draw);
  }
  draw();
}
spark("spark1");
spark("spark2");
