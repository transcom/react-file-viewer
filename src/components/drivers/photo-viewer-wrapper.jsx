// Copyright (c) 2017 PlanGrid, Inc.

import React, { Component } from 'react'

import * as ThreeLib from 'three'
import PhotoViewer from './photo-viewer'
import Loading from '../loading'

export default class PhotoViewerWrapper extends Component {
  constructor(props) {
    super(props)

    this.state = {
      originalWidth: 0,
      originalHeight: 0,
      imageLoaded: false,
    }
  }

  componentDidMount() {
    // spike on using promises and a different loader or adding three js loading manager
    const loader = new ThreeLib.TextureLoader()
    loader.crossOrigin = ''
    // get error handler
    var onError = this.props.onError
    if (typeof onError == 'undefined' || onError == null) {
      onError = (xhr) => {
        console.log('An error happened', xhr)
      }
    }
    // load a resource
    loader.load(
      // resource URL
      this.props.filePath,
      // Function when resource is loaded
      (texture) => {
        this.setState({
          originalWidth: texture.image.width,
          originalHeight: texture.image.height,
          imageLoaded: true,
          texture,
        })
      },
      (xhr) => {
        console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`)
      },
      onError
    )
  }

  render() {
    if (!this.state.imageLoaded) {
      return <Loading />
    }

    return <PhotoViewer {...this.state} {...this.props} />
  }
}
