import React from 'react';
import { PalAvatar } from './PalAvatar';

type RivePreviewProps = {
  file?: number | string;
  title?: string;
  width?: number;
  height?: number;
};

const fallbackSprite = {
  id: 'preview',
  label: 'Rive preview',
  webSrc: 'https://public.rive.app/community/runtime-files/2195-4346-avatar-pack-use-case.riv',
  nativeSource: 'https://public.rive.app/community/runtime-files/2195-4346-avatar-pack-use-case.riv'
};

export function RivePreview({ file, title, width, height }: RivePreviewProps) {
  const sprite = {
    ...fallbackSprite,
    label: title ?? fallbackSprite.label,
    nativeSource: file ?? fallbackSprite.nativeSource
  };

  return (
    <PalAvatar
      sprite={sprite}
      width={width}
      height={height}
      title={title}
    />
  );
}
