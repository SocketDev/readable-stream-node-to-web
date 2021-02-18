
/* global ReadableStream */

class NodeToWebStreamSource {
  _readableCallback = null
  _controller = null

  constructor (nodeStream) {
    this._nodeStream = nodeStream
  }

  // Stream methods
  start (controller) {
    this._controller = controller

    this._nodeStream.on('close', this._onClose)
    this._nodeStream.on('end', this._onClose)
    this._nodeStream.on('error', this._onError)
    this._nodeStream.on('readable', this._onReadable)
  }

  async pull () {
    console.log('pull')
    let isFirstRead = true

    while (true) {
      const chunk = this._nodeStream.read()
      if (chunk === null) {
        if (isFirstRead) {
          // Wait for at least one chunk
          await new Promise((resolve) => {
            this._readableCallback = resolve
          })
        } else {
          break
        }
      }

      isFirstRead = false
      console.log('enqueue')
      this._controller.enqueue(chunk)
    }
  }

  cancel () {
    this._destroy()
    this._nodeStream.destroy()
  }

  // Internal methods
  _onClose = () => {
    console.log('close')
    this._destroy()
    this._controller.close()
  }

  _onError = (err) => {
    console.log('error')
    this._destroy()
    this._controller.error(err)
  }

  _onReadable = () => {
    console.log('readable')
    if (this._readableCallback) {
      this._readableCallback()
      this._readableCallback = null
    }
  }

  _destroy () {
    this._nodeStream.off('close', this._onClose)
    this._nodeStream.off('end', this._onClose)
    this._nodeStream.off('error', this._onError)
    this._nodeStream.off('readable', this._onReadable)
  }
}

const nodeToWeb = (nodeStream) => {
  if (typeof ReadableStream === 'undefined') throw new Error('No web ReadableStream support')

  return new ReadableStream(new NodeToWebStreamSource(nodeStream))
}

module.exports = nodeToWeb
