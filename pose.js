const video5 = document.getElementsByClassName('input_video5')[0];
const out5 = document.getElementsByClassName('output5')[0];
const controlsElement5 = document.getElementsByClassName('control5')[0];
const canvasCtx5 = out5.getContext('2d');

out5.width = out5.height

var complete = false
var start = true
var partial = false
var count = 10

const fpsControl = new FPS();

const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
  spinner.style.display = 'none';
};

function zColor(data) {
  const z = clamp(data.from.z + 0.5, 0, 1);
  return `rgba(0, ${255 * z}, ${255 * (1 - z)}, 1)`;
}

const getAngle = (firstPoint, midPoint, lastPoint) => {

  var result = (Math.atan2(lastPoint.y - midPoint.y,
            lastPoint.x - midPoint.x)
                - Math.atan2(firstPoint.y - midPoint.y,
            firstPoint.x - midPoint.x))*180/Math.PI
            
  result = Math.abs(result)
  
  if (result > 180) {
    result = 360.0 - result // Always get the acute representation of the angle
  }
  return result

}

function onResultsPose(results) {
  document.body.classList.add('loaded');
  fpsControl.tick();
  
  let speech = new SpeechSynthesisUtterance()

  canvasCtx5.save();
  canvasCtx5.clearRect(0, 0, out5.width, out5.height);
  canvasCtx5.drawImage(
      results.image, 0, 0, out5.width, out5.height);
      
  if(results.poseLandmarks !== undefined)
  {
      
  let b_angle = getAngle(results.poseLandmarks[12], results.poseLandmarks[24], results.poseLandmarks[26])
  let k_angle = getAngle(results.poseLandmarks[24], results.poseLandmarks[26], results.poseLandmarks[28])
  
  canvasCtx5.font = '7px Arial'
  
  if(results.poseLandmarks[28].visibility < 0.25 && results.poseLandmarks[27].visibility < 0.25)
  {
    canvasCtx5.fillText('Legs not visible', 20, 10)
  }
  
  if(Math.abs(results.poseLandmarks[24].x - results.poseLandmarks[23].x)*1000 >= 70)
  {
    canvasCtx5.fillText('Face your right side', 20, 20)
    
    speech.text = 'Face right'
    
    window.speechSynthesis.speaking ? null : window.speechSynthesis.speak(speech)
    
  }
  
  if(k_angle <= 120 && k_angle >= 60 && complete)
  {
    partial = true
  }
  
  if(k_angle > 150 && b_angle > 150 && start)
  {
    complete = true
  }
  
  if(complete)
  {
    if((k_angle < 60) && Math.abs(results.poseLandmarks[24].x - results.poseLandmarks[23].x)*1000 < 50)
    {
      complete = false
      count--
      partial = false
      
      window.speechSynthesis.cancel()
      
      speech.text = `${count} squats to go`
      
      window.speechSynthesis.speak(speech)
      
      if(count === 0)
      {
        start = false
      }
    }
  }
  
  if(partial && (k_angle > 150 && b_angle > 150))
  {
    canvasCtx5.fillText('Partial squat', 20, 30)
    
    speech.text = 'Partial squat'
    
    window.speechSynthesis.speaking ? null : window.speechSynthesis.speak(speech)
    
    partial = false
  }
  
  canvasCtx5.fillText(`Count = ${count}`, 20, 40)
  
  drawConnectors(
      canvasCtx5, results.poseLandmarks, POSE_CONNECTIONS, {
        color: (data) => {
          const x0 = out5.width * data.from.x;
          const y0 = out5.height * data.from.y;
          const x1 = out5.width * data.to.x;
          const y1 = out5.height * data.to.y;

          const z0 = clamp(data.from.z + 0.5, 0, 1);
          const z1 = clamp(data.to.z + 0.5, 0, 1);

          const gradient = canvasCtx5.createLinearGradient(x0, y0, x1, y1);
          gradient.addColorStop(
              0, '#FFFFFF');
          gradient.addColorStop(
              1.0, '#FFFFFF');
          return gradient;
        },
        lineWidth: 1
      });
  drawLandmarks(
      canvasCtx5,
      Object.values(POSE_LANDMARKS_LEFT)
          .map(index => results.poseLandmarks[index]),
      {color: '#FF0000', fillColor: '#FF0000', lineWidth: 0, radius: 2});
  drawLandmarks(
      canvasCtx5,
      Object.values(POSE_LANDMARKS_RIGHT)
          .map(index => results.poseLandmarks[index]),
      {color: '#FF0000', fillColor: '#FF0000', lineWidth: 0, radius: 2});
  drawLandmarks(
      canvasCtx5,
      Object.values(POSE_LANDMARKS_NEUTRAL)
          .map(index => results.poseLandmarks[index]),
      {color: '#FF0000', fillColor: '#FF0000', lineWidth: 0, radius: 2});
      
  } else
  {
    canvasCtx5.fillText('Not getting detected', 20, 10)
  }
  canvasCtx5.restore();
}

const pose = new Pose({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.2/${file}`;
}});
pose.onResults(onResultsPose);

const camera = new Camera(video5, {
  onFrame: async () => {
    await pose.send({image: video5});
  },
  width: out5.width,
  height: out5.height
});
camera.start();

new ControlPanel(controlsElement5, {
      selfieMode: true,
      upperBodyOnly: false,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    })
    .add([
      new StaticText({title: 'MediaPipe Pose'}),
      fpsControl,
      new Toggle({title: 'Selfie Mode', field: 'selfieMode'}),
      new Toggle({title: 'Upper-body Only', field: 'upperBodyOnly'}),
      new Toggle({title: 'Smooth Landmarks', field: 'smoothLandmarks'}),
      new Slider({
        title: 'Min Detection Confidence',
        field: 'minDetectionConfidence',
        range: [0, 1],
        step: 0.01
      }),
      new Slider({
        title: 'Min Tracking Confidence',
        field: 'minTrackingConfidence',
        range: [0, 1],
        step: 0.01
      }),
    ])
    .on(options => {
      video5.classList.toggle('selfie', options.selfieMode);
      pose.setOptions(options);
    });
