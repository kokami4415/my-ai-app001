'use client';

import Image from 'next/image';

export default function TitleImage({ size = 'large', className = '' }) {
  const dimensions = size === 'small'
    ? { width: 320, height: 64 }
    : { width: 400, height: 80 };

  return (
    <div className={`flex justify-center ${className}`}>
      <Image
        src="/image/recipe_title.png"
        alt="レシピおまかせ君 タイトル画像"
        width={dimensions.width}
        height={dimensions.height}
        priority
      />
    </div>
  );
}


