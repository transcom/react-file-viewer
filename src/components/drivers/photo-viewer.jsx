// Copyright (c) 2017 PlanGrid, Inc.

import React, { Component } from 'react'

import 'styles/photo-viewer.scss'

export default class PhotoViewer extends Component {
  constructor(props) {
    super(props)

    const { originalHeight, height: viewerHeight } = props
    const heightRatio = viewerHeight / originalHeight
    // by default we want to fill the viewport vertically
    const defaultZoomRatio = heightRatio > 1 ? heightRatio : 1

    // zoom steps: 10% through 200%
    this.zoomSteps = [0.1, 0.25, 0.5, 0.75, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0]

    this.baseZoomRatio = defaultZoomRatio
    const closestZoomIndex = this.zoomSteps.findIndex((z) => z === 1.0)

    this.state = {
      zoomStepIndex: closestZoomIndex !== -1 ? closestZoomIndex : 0,
    }

    this.increaseZoom = this.increaseZoom.bind(this)
    this.reduceZoom = this.reduceZoom.bind(this)
    this.rotateLeft = this.rotateLeft.bind(this)
    this.rotateRight = this.rotateRight.bind(this)
  }

  setZoom(index) {
    this.setState({ zoomStepIndex: index })

    const scaleContainer = document.getElementById(
      'photo-viewer-scale-container'
    )

    // Redraw container to bypass bug in chromium browsers where overflow scrollbars do not render consistently
    scaleContainer.style.display = 'none'
    scaleContainer.offsetHeight
    scaleContainer.style.display = 'block'
  }

  increaseZoom() {
    const { zoomStepIndex } = this.state
    if (zoomStepIndex < this.zoomSteps.length - 1) {
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

  componentDidMount() {
    this.props.texture.image.style.width = 'auto'
    this.props.texture.image.style.height = 'auto'
    this.props.texture.image.setAttribute('class', 'photo')
    this.props.texture.image.style.display = 'block'
    this.props.texture.image.style.marginLeft = 'auto'
    this.props.texture.image.style.marginRight = 'auto'
    document
      .getElementById('photo-viewer-image-container')
      .appendChild(this.props.texture.image)
  }

  componentWillUnmount() {
    const { texture } = this.props
    const image = texture.image
    if (image.parentNode) {
      image.parentNode.removeChild(image)
    }
  }

  render() {
    const { renderControls, rotationValue } = this.props
    const { zoomStepIndex } = this.state
    const zoomScale = this.baseZoomRatio * this.zoomSteps[zoomStepIndex]
    const scaleTranslation =
      zoomScale > this.baseZoomRatio ? 12.5 * this.zoomSteps[zoomStepIndex] : 0

    const scaleContainerStyle = {
      display: 'block',
      transformOrigin: 'center center',
      transform: `scale(${zoomScale}) translate(${scaleTranslation}%, ${scaleTranslation}%)`,
      height: '100%',
      width: '100%',
    }

    const containerStyles = {
      width: `${this.props.width}px`,
      height: `${this.props.height - 50}px`,
      overflow: `auto`,
    }

    const imageContainerStyles = {
      display: 'flex',
    }

    if (rotationValue !== undefined) {
      let translationX = 0
      if (rotationValue === 1) {
        translationX = 25
        imageContainerStyles.marginTop = '4em'
      }
      if (rotationValue === 3) {
        translationX = -25
        imageContainerStyles.marginTop = '4em'
      }

      imageContainerStyles.transform = `rotate(${
        rotationValue * 90
      }deg) translate(${translationX}%, 0%)`
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
            style={imageContainerStyles}>
            &nbsp;
          </div>
        </div>
        {renderControls ? (
          renderControls({
            handleZoomIn: this.increaseZoom,
            handleZoomOut: this.reduceZoom,
            handleRotateLeft: this.rotateLeft,
            handleRotateRight: this.rotateRight,
            zoomPercentage: Math.round(
              this.zoomSteps[this.state.zoomStepIndex] * 100
            ),
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
