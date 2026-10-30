export function drawCover(ctx: CanvasRenderingContext2D, image: CanvasImageSource, x: number, y: number, width: number, height: number, scale = 1, offsetX = 0, offsetY = 0) {
  const source = image as HTMLImageElement
  const sourceWidth = source.naturalWidth || (image as unknown as HTMLCanvasElement).width
  const sourceHeight = source.naturalHeight || (image as unknown as HTMLCanvasElement).height
  const cropScale = Math.max(width / sourceWidth, height / sourceHeight) * scale
  const cropWidth = width / cropScale
  const cropHeight = height / cropScale
  const sourceX = (sourceWidth - cropWidth) / 2 + offsetX * cropWidth
  const sourceY = (sourceHeight - cropHeight) / 2 + offsetY * cropHeight
  ctx.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, x, y, width, height)
}

export function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
}
