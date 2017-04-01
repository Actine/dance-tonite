import * as THREE from './lib/three';

import props from './props';
import { tempQuaternion, tempVector, createInstancedMesh } from './utils/three';
import viewer from './viewer';
import settings from './settings';
import storage from './storage';
import { getCostumeColor } from './theme/colors';

const num = 20;
let roomIndex = 0;
let roomMesh;
let roomMeshes;

const roomOffset = new THREE.Vector3(0, settings.roomHeight * 0.5, 0);

const transformMesh = (
  instancedMesh,
  index,
  [x, y, z, qx, qy, qz, qw],
  scale,
  offset,
) => {
  instancedMesh.setQuaternionAt(index, tempQuaternion(qx, qy, qz, qw));
  instancedMesh.setPositionAt(
    index,
    tempVector(x, y, z - settings.roomOffset).add(offset),
  );
  instancedMesh.setScaleAt(index, tempVector(scale, scale, scale));
  instancedMesh.needsUpdate();
};

export default class Room {
  constructor(url, { showHead }) {
    this.index = roomIndex;
    this.showHead = showHead;
    roomIndex += 1;
    this.url = url;
    this.position = new THREE.Vector3();

    const costumeColor = getCostumeColor(this.index);

    if (!roomMesh) {
      roomMeshes = {
        default: createInstancedMesh(
          num,
          getCostumeColor(0),
          props.room.geometry,
        ),
        ortographic: createInstancedMesh(
          num,
          getCostumeColor(0),
          props.ortographicRoom.geometry,
        ),
      };
      roomMesh = roomMeshes.default;
      viewer.scene.add(roomMesh);
    }

    this.position.set(
      0,
      0,
      settings.roomOffset + (this.index * (settings.roomDepth + 0.001)),
    );
    this.updatePosition();

    this.handMesh = createInstancedMesh(
      200,
      costumeColor,
      props.hand.geometry,
    );
    viewer.scene.add(this.handMesh);

    if (showHead) {
      this.headMesh = createInstancedMesh(
        200,
        costumeColor,
        props.head.geometry,
      );
      viewer.scene.add(this.headMesh);
    }
  }

  load(callback) {
    storage.load(this.url, (error, performances) => {
      if (error) return callback(error);
      this.performances = performances;
      callback();
    });
  }

  updatePosition() {
    const position = tempVector(0, 0, 0).add(this.position).add(roomOffset);
    for (const i in roomMeshes) {
      roomMeshes[i].setPositionAt(this.index, position);
      roomMeshes[i].needsUpdate('position');
    }
  }

  gotoTime(time) {
    let seconds = time * 0.001;

    // Offset every other room in time by half a loop, so whenever our floating
    // camera enters the room, we are seeing a recording:
    if (this.index % 2 === 0) {
      seconds += settings.loopSeconds;
    }

    const number = Math.floor((seconds % (settings.loopSeconds * 2)) * 90);

    if (!this.performances) return;

    // In orthographic mode, scale up the meshes:
    const scale = roomMesh === roomMeshes.ortographic ? 1.3 : 1;
    for (let i = 0; i < this.performances.length; i++) {
      const frames = this.performances[i];
      const [head, left, right] = frames[number % frames.length];
      if (this.showHead) {
        transformMesh(this.headMesh, i, head, scale, this.position);
      }
      transformMesh(this.handMesh, i * 2, left, scale, this.position);
      transformMesh(this.handMesh, (i * 2) + 1, right, scale, this.position);
    }
  }
}

Room.switchModel = (model) => {
  viewer.scene.remove(roomMesh);
  roomMesh = roomMeshes[model];
  viewer.scene.add(roomMesh);
};