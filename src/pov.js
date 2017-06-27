import closestHead from './utils/closestHead';
import intersectOrb from './utils/intersectcenter';
import viewer from './viewer';
import InstancedItem from './instanced-item';
import Room from './room';
import layout from './room/layout';
import settings from './settings';
import controllers from './controllers';
import audio from './audio';

export default function create({ rooms, orb, offset = 0 }) {
  const { holeHeight } = settings;
  let pointerX;
  let pointerY;
  let hoverPerformance;
  let hoverOrb;

  const onMouseMove = ({ clientX, clientY }) => {
    if (viewer.vrEffect.isPresenting) return;
    pointerX = clientX;
    pointerY = clientY;
  };

  const onMouseDown = ({ clientX, clientY, touches }) => {
    if (viewer.vrEffect.isPresenting) return;
    let x = clientX;
    let y = clientY;
    if (touches && touches.length > 0) {
      x = touches[0].pageX;
      y = touches[0].pageY;
    }

    hoverOrb = intersectOrb(x, y);
    hoverPerformance = closestHead(x, y, rooms);

    if (hoverPerformance || hoverOrb) {
      viewer.switchCamera('default');
      InstancedItem.group.add(viewer.camera);
    }
  };

  const onMouseUp = () => {
    if (viewer.vrEffect.isPresenting) return;
    hoverPerformance = null;
    hoverOrb = false;
    viewer.switchCamera('orthographic');
  };

  const clearHighlights = () => {
    hoverPerformance = null;
    hoverOrb = false;
    orb.unhighlight();
    Room.setHighlight();
  };

  // Whenever the audio loops, move to the next head if necessary:
  const onLoop = (loopIndex) => {
    if (!hoverPerformance) return;
    const [index, headIndex] = hoverPerformance;
    if (
      (index % 2 === 0 && loopIndex % 2 === 1) ||
      (index % 2 === 1 && loopIndex % 2 === 0)
    ) {
      hoverPerformance[1] = (headIndex + 1) % rooms[index].frame.count;
      Room.setHighlight(hoverPerformance);
    }
  };

  window.addEventListener('vrdisplaypresentchange', clearHighlights, false);

  audio.on('loop', onLoop);

  const POV = {
    update: (progress = 0, fixedControllers = false) => {
      if (!viewer.vrEffect.isPresenting) {
        if (intersectOrb(pointerX, pointerY)) {
          orb.highlight();
          Room.setHighlight();
        } else {
          orb.unhighlight();
          if (!hoverPerformance && !hoverOrb) {
            Room.setHighlight(
              closestHead(
                pointerX,
                pointerY,
                rooms
              )
            );
          }
        }
      }

      const position = layout.getPosition(progress + offset + 0.5);
      position.y += holeHeight;
      position.z *= -1;

      if (fixedControllers) {
        controllers.fixToPosition(position);
      }
      viewer.camera.position.copy(position);
      if (hoverOrb) {
        // Move camera into orb:
        viewer.camera.position.z *= -1;
        viewer.camera.rotation.set(0, Math.PI, 0);
      } else if (hoverPerformance) {
        // Move camera into head of performance:
        const [index, headIndex] = hoverPerformance;
        rooms[index].transformToHead(viewer.camera, headIndex);
      }
    },

    setupInput: () => {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchstart', onMouseDown, false);
      window.addEventListener('touchend', onMouseUp, false);
    },

    removeInput: () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('vrdisplaypresentchange', clearHighlights);
      audio.off('loop', onLoop);
    },

    clearHighlights,
  };

  return POV;
}
