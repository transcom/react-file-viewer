// Copyright (c) 2017 PlanGrid, Inc.

import React, { Component } from 'react'

import 'styles/photo-viewer.scss'

const ZOOM_VALUES = [
  0.1,
  0.25,
  0.5,
  0.75,
  1.0,
  1.1,
  1.25,
  1.5,
  1.75,
  2.0,
  2.25,
  2.5,
  2.75,
  3.0,
]

// Create immutable Map for zoom steps
const ZOOM_STEPS = new Map(ZOOM_VALUES.map((value, index) => [index, value]))
Object.freeze(ZOOM_STEPS)

const MAX_ZOOM_INDEX = ZOOM_VALUES.length - 1
const CONTROLS_HEIGHT = 50
const CONTAINER_BUFFER = 40
const PADDING_THRESHOLD = -30
const STATIC_PADDING = 20
const MAX_DYNAMIC_PADDING = 100
const MIN_CONTAINER_PADDING = 90
const WIDTH_FIT_SCALE = 0.95

export default class PhotoViewer extends Component {
  constructor(props) {
    super(props)

    const { originalHeight, originalWidth, width: viewerWidth } = props

    const bestFitZoomIndex = this.calculateBestFitZoom(
      originalWidth,
      originalHeight,
      viewerWidth
    )

    this.state = {
      zoomStepIndex: bestFitZoomIndex,
      horizontalPadding: 0,
      verticalPadding: 0,
    }

    this.increaseZoom = this.increaseZoom.bind(this)
    this.reduceZoom = this.reduceZoom.bind(this)
    this.rotateLeft = this.rotateLeft.bind(this)
    this.rotateRight = this.rotateRight.bind(this)
    this.updateImageDimensions = this.updateImageDimensions.bind(this)
  }

  getSafeIndex(index) {
    return Math.max(0, Math.min(Math.floor(Number(index) || 0), MAX_ZOOM_INDEX))
  }

  getZoomValue(index) {
    return ZOOM_STEPS.get(this.getSafeIndex(index)) || 1.0
  }

  findClosestZoomStep(targetScale) {
    let closestIndex = 0
    let smallestDiff = Math.abs(ZOOM_VALUES[0] - targetScale)

    ZOOM_VALUES.forEach((step, index) => {
      const diff = Math.abs(step - targetScale)
      if (diff < smallestDiff) {
        smallestDiff = diff
        closestIndex = index
      }
    })

    return closestIndex
  }

  calculateBestFitZoom(imageWidth, imageHeight, containerWidth) {
    if (imageWidth > imageHeight) {
      const scaleWidth = (containerWidth / imageWidth) * WIDTH_FIT_SCALE
      return this.findClosestZoomStep(scaleWidth)
    }

    return this.findClosestZoomStep(1.0)
  }

  setZoom(index) {
    this.setState({ zoomStepIndex: this.getSafeIndex(index) })
  }

  increaseZoom() {
    const { zoomStepIndex } = this.state
    if (zoomStepIndex < MAX_ZOOM_INDEX) {
      this.setZoom(zoomStepIndex + 1)
    }
  }

  reduceZoom() {
    const { zoomStepIndex } = this.state
    if (zoomStepIndex > 0) {
      this.setZoom(zoomStepIndex - 1)
    }
  }

  updateRotation(rot) {
    if (rot >= 0 && rot <= 3) {
      this.props.setRotationValue(rot)
    }
  }

  rotateLeft() {
    const newRotation = (this.props.rotationValue + 3) % 4
    this.updateRotation(newRotation)
  }

  rotateRight() {
    const newRotation = (this.props.rotationValue + 1) % 4
    this.updateRotation(newRotation)
  }

  calculatePadding(dimension, containerSize, useDynamicPadding = false) {
    const diff = dimension - containerSize
    if (diff < PADDING_THRESHOLD) return 0

    if (useDynamicPadding) {
      return Math.min(Math.abs(diff), MAX_DYNAMIC_PADDING)
    }

    return STATIC_PADDING
  }

  getRotationConfig(width, height, rotation) {
    const isRotated90or270 = rotation % 2 === 1
    return {
      horizontal: isRotated90or270 ? height : width,
      vertical: isRotated90or270 ? width : height,
      useDynamicVertical: !isRotated90or270,
    }
  }

  applyRotatedPadding(image, horizontal, vertical, rotation) {
    const paddingMap = [
      { top: vertical, right: horizontal, bottom: 0, left: 0 }, // 0 deg
      { top: horizontal, right: 0, bottom: 0, left: vertical }, // 90 deg
      { top: 0, right: 0, bottom: vertical, left: horizontal }, // 180 deg
      { top: 0, right: vertical, bottom: horizontal, left: 0 }, // 270 deg
    ]

    const padding = paddingMap[rotation] || paddingMap[0]
    Object.assign(image.style, {
      paddingTop: `${padding.top}px`,
      paddingRight: `${padding.right}px`,
      paddingBottom: `${padding.bottom}px`,
      paddingLeft: `${padding.left}px`,
    })
  }

  updateImageDimensions() {
    const {
      texture,
      originalHeight,
      originalWidth,
      rotationValue = 0,
      width,
      height,
    } = this.props
    const { zoomStepIndex } = this.state
    const zoomScale = this.getZoomValue(zoomStepIndex)

    if (!texture?.image) return

    const image = texture.image
    const newWidth = originalWidth * zoomScale
    const newHeight = originalHeight * zoomScale

    const { horizontal, vertical, useDynamicVertical } = this.getRotationConfig(
      newWidth,
      newHeight,
      rotationValue
    )

    const horizontalPadding = this.calculatePadding(horizontal, width, false)
    const verticalPadding = this.calculatePadding(
      vertical,
      height - CONTROLS_HEIGHT,
      useDynamicVertical
    )

    this.setState({ horizontalPadding, verticalPadding })

    Object.assign(image.style, {
      width: `${newWidth}px`,
      height: `${newHeight}px`,
      maxWidth: 'none',
      maxHeight: 'none',
      transform: 'none',
      display: 'block',
    })

    this.applyRotatedPadding(
      image,
      horizontalPadding,
      verticalPadding,
      rotationValue
    )
  }

  componentDidMount() {
    const { texture } = this.props
    const container = document.getElementById('photo-viewer-image-container')

    texture.image.setAttribute('class', 'photo')
    texture.image.setAttribute('z-index', '0')
    container.appendChild(texture.image)

    this.updateImageDimensions()
  }

  componentDidUpdate(prevProps, prevState) {
    const zoomChanged = prevState.zoomStepIndex !== this.state.zoomStepIndex
    const rotationChanged = prevProps.rotationValue !== this.props.rotationValue

    if (zoomChanged || rotationChanged) {
      this.updateImageDimensions()
    }
  }

  componentWillUnmount() {
    const { texture } = this.props
    const image = texture?.image
    if (image?.parentNode) {
      image.parentNode.removeChild(image)
    }
  }

  calculateUncappedVerticalPadding(zoomScale, rotationValue, height) {
    const { vertical } = this.getRotationConfig(
      this.props.originalWidth * zoomScale,
      this.props.originalHeight * zoomScale,
      rotationValue
    )
    const isRotated0or180 = rotationValue % 2 === 0
    const diff = vertical - (height - CONTROLS_HEIGHT)

    return Math.max(
      MIN_CONTAINER_PADDING,
      isRotated0or180 && diff >= PADDING_THRESHOLD
        ? Math.abs(diff)
        : STATIC_PADDING
    )
  }

  render() {
    const {
      renderControls,
      rotationValue = 0,
      originalWidth,
      originalHeight,
      width,
      height,
    } = this.props
    const { zoomStepIndex, horizontalPadding, verticalPadding } = this.state
    const zoomScale = this.getZoomValue(zoomStepIndex)

    const isRotated90or270 = rotationValue % 2 === 1
    const rotatedWidth = isRotated90or270
      ? originalHeight * zoomScale
      : originalWidth * zoomScale
    const rotatedHeight = isRotated90or270
      ? originalWidth * zoomScale
      : originalHeight * zoomScale

    const uncappedVerticalPadding = this.calculateUncappedVerticalPadding(
      zoomScale,
      rotationValue,
      height
    )

    const containerDimension = isRotated90or270 ? height : width
    const overflowDiff = Math.max(
      0,
      originalWidth * zoomScale - containerDimension + CONTAINER_BUFFER
    )
    const isPositive = rotationValue < 2
    const offset = (isPositive ? overflowDiff : -overflowDiff) / 2

    const containerStyles = {
      maxWidth: `${width}px`,
      maxHeight: `${height - CONTROLS_HEIGHT + verticalPadding * 2}px`,
      overflow: 'auto',
      zIndex: 1,
    }

    const imageContainerStyle = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: `rotate(${rotationValue * 90}deg) translate(${offset}px)`,
      transformOrigin: 'center center',
    }

    const scaleContainerStyle = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100%',
      minWidth: '100%',
      width: `${Math.max(
        rotatedWidth +
          Math.abs(offset) +
          horizontalPadding * 2 +
          CONTAINER_BUFFER,
        width
      )}px`,
      height: `${Math.max(
        rotatedHeight +
          Math.abs(offset) +
          verticalPadding * 2 +
          CONTAINER_BUFFER,
        height - CONTROLS_HEIGHT + verticalPadding * 2
      )}px`,
      paddingTop: `${uncappedVerticalPadding}px`,
    }

    return (
      <div
        className="photo-viewer-container"
        style={containerStyles}
        id="pg-photo-container">
        <div
          className="photo-viewer-scale-container"
          id="photo-viewer-scale-container"
          style={scaleContainerStyle}>
          <div
            className="photo-viewer-image-container"
            id="photo-viewer-image-container"
            style={imageContainerStyle}>
            &nbsp;
          </div>
        </div>
        {renderControls ? (
          renderControls({
            handleZoomIn: this.increaseZoom,
            handleZoomOut: this.reduceZoom,
            handleRotateLeft: this.rotateLeft,
            handleRotateRight: this.rotateRight,
            zoomPercentage: Math.round(this.getZoomValue(zoomStepIndex) * 100),
          })
        ) : (
          <div className="photo-controls-container">
            <button
              type="button"
              className="view-control"
              onClick={this.increaseZoom}>
              <i className="zoom-in" />
            </button>
            <button
              type="button"
              className="view-control"
              onClick={this.reduceZoom}>
              <i className="zoom-out" />
            </button>
            <button
              type="button"
              className="view-control"
              onClick={this.rotateLeft}>
              <i className="rotate-left" />
            </button>
            <button
              type="button"
              className="view-control"
              onClick={this.rotateRight}>
              <i className="rotate-right" />
            </button>
          </div>
        )}
      </div>
    )
  }
}
