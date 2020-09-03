// Copyright (c) 2017 PlanGrid, Inc.

// TODO
/* eslint-disable jsx-a11y/media-has-caption */

import React, { Component } from 'react'

import 'styles/video.scss'
import Loading from '../loading'

class VideoViewer extends Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: true,
    }
  }

  onCanPlay() {
    this.setState({ loading: false })
  }

  renderLoading() {
    if (this.state.loading) {
      return <Loading />
    }
    return null
  }

  render() {
    const visibility = this.state.loading ? 'hidden' : 'visible'
    return (
      <div className="pg-driver-view">
        <div className="video-container">
          {this.renderLoading()}
          <video
            style={{ visibility }}
            controls
            type={`video/${this.props.fileType}`}
            onCanPlay={(e) => this.onCanPlay(e)}
            src={this.props.filePath}>
            Video playback is not supported by your browser.
          </video>
        </div>
      </div>
    )
  }
}

export default VideoViewer
