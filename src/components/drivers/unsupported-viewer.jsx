// Copyright (c) 2017 PlanGrid, Inc.

import React from 'react'
import 'styles/unsupported.scss'

const UnsupportedViewer = (props) => (
  <div className="pg-driver-view">
    <div className="unsupported-message">
      {props.unsupportedComponent ? (
        <props.unsupportedComponent {...props} />
      ) : (
        <p>
          {`No preview available for this kind of file.\nDownload file to see the contents.`}
        </p>
      )}
    </div>
  </div>
)

export default UnsupportedViewer
