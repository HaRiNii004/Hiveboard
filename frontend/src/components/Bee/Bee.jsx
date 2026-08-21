import React from 'react';
import ideabee from '../../assets/ideabee.png';
import chainsawbee from '../../assets/chainsawbee.png';
import readbee from '../../assets/readbee.png';
import './Bee.css';

export default function Bee({ x, y, rotate, type = 'idea', size = 65 }) {
  let beeImage;
  
  switch (type) {
    case 'chainsaw':
      beeImage = chainsawbee;
      break;
    case 'read':
      beeImage = readbee;
      break;
    case 'idea':
    default:
      beeImage = ideabee;
      break;
  }

  const halfSize = size / 2;

  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotate || 0})`} className="bee-actor">
      <g transform={`translate(${-halfSize}, ${-halfSize})`}>
        <image
          href={beeImage}
          width={size}
          height={size}
        />
      </g>
    </g>
  );
}

