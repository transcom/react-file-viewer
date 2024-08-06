// Copyright (c) 2017 PlanGrid, Inc.

import React, { Component } from 'react'

import 'styles/photo-viewer.scss'

export default class PhotoViewer extends Component {
  constructor(props) {
    super(props)

    this.state = {
      imgZoom: 10,
      rotation: 0,
    }

    this.increaseZoom = this.increaseZoom.bind(this)
    this.reduceZoom = this.reduceZoom.bind(this)
    this.rotateLeft = this.rotateLeft.bind(this)
    this.rotateRight = this.rotateRight.bind(this)
  }

  setZoom(zoom) {
    this.setState({
      imgZoom: zoom,
    })
  }

  increaseZoom() {
    const { imgZoom } = this.state
    this.setZoom(imgZoom + 1)
  }

  reduceZoom() {
    const { imgZoom } = this.state
    if (imgZoom > 1) {
      this.setZoom(imgZoom - 1)
    }
  }

  updateRotation(rot) {
    if (rot >= 0 && rot <= 3) {
      this.setState({
        rotation: rot,
      })
    }
  }

  rotateLeft() {
    const { rotation } = this.state
    const newRotation = (rotation + 3) % 4
    this.updateRotation(newRotation)
  }

  rotateRight() {
    const { rotation } = this.state
    const newRotation = (rotation + 1) % 4
    this.updateRotation(newRotation)
  }

  componentDidMount() {
    const { originalWidth, originalHeight } = this.props
    const imageDimensions = this.getImageDimensions.call(
      this,
      originalWidth,
      originalHeight
    )

    this.props.texture.image.style.width = `${imageDimensions.width}px`
    this.props.texture.image.style.height = `${imageDimensions.height}px`
    this.props.texture.image.style.transformOrigin = 'center center'
    this.props.texture.image.setAttribute('class', 'photo')
    this.props.texture.image.setAttribute('z-index', '0')
    document
      .getElementById('photo-viewer-image-container')
      .appendChild(this.props.texture.image)
  }

  getImageDimensions(originalWidth, originalHeight) {
    // Scale image to fit into viewer
    let imgHeight
    let imgWidth
    const { height: viewerHeight, width: viewerWidth } = this.props

    if (originalHeight <= viewerHeight && originalWidth <= viewerWidth) {
      imgWidth = originalWidth
      imgHeight = originalHeight
    } else {
      const heightRatio = viewerHeight / originalHeight
      const widthRatio = viewerWidth / originalWidth
      if (heightRatio < widthRatio) {
        imgHeight = originalHeight * heightRatio
        imgWidth = originalWidth * heightRatio
      } else {
        imgHeight = originalHeight * widthRatio
        imgWidth = originalWidth * widthRatio
      }
    }

    return { height: imgHeight, width: imgWidth }
  }

  render() {
    const { renderControls, texture } = this.props
    const { imgZoom } = this.state
    const scaleContainerStyle = {
      transformOrigin: 'center center',
    }
    const containerStyles = {
      width: `${this.props.width}px`,
      height: `${this.props.height}px`,
      zIndex: 1,
    }

    texture.image.style.transform = `rotate(${this.state.rotation * 90}deg)`
    scaleContainerStyle.transform = `scale(${imgZoom * 0.1})`

    return (
      <div
        className="photo-viewer-container"
        style={containerStyles}
        id="pg-photo-container"
      >
        <div
          className="photo-viewer-scale-container"
          id="photo-viewer-scale-container"
          style={scaleContainerStyle}
        >
          <div
            className="photo-viewer-image-container"
            id="photo-viewer-image-container"
          >
            &nbsp;
          </div>
        </div>
        {renderControls ? (
          renderControls({
            handleZoomIn: this.increaseZoom,
            handleZoomOut: this.reduceZoom,
            handleRotateLeft: this.rotateLeft,
            handleRotateRight: this.rotateRight,
          })
        ) : (
          <div className="photo-controls-container">
            <button
              type="button"
              className="view-control"
              onClick={this.increaseZoom}
            >
              <i className="zoom-in" />
            </button>
            <button
              type="button"
              className="view-control"
              onClick={this.reduceZoom}
            >
              <i className="zoom-out" />
            </button>
            <button
              type="button"
              className="view-control"
              onClick={this.rotateLeft}
            >
              <i className="rotate-left" />
            </button>
            <button
              type="button"
              className="view-control"
              onClick={this.rotateRight}
            >
              <i className="rotate-right" />
            </button>
          </div>
        )}
      </div>
    )
  }
}
