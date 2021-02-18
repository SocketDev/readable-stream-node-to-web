
/* global ReadableStream */

class NodeToWebStreamSource {
  constructor (nodeStream) {
    this._nodeStream = nodeStream

    this._readableCallback = null
    this._controller = null

    this._handlers = {
      end: this._onClose.bind(this),
      close: this._onClose.bind(this),
      error: this._onError.bind(this),
      readable: this._onReadable.bind(this)
    }
  }

  // Stream methods
  start (controller) {
    this._controller = controller

    for (const [event, handler] of Object.entries(this._handlers)) {
      this._nodeStream.on(event, handler)
    }
  }

  async pull () {
    let isFirstRead = true

    while (true) {
      const chunk = this._nodeStream.read()
      if (chunk === null) {
        if (isFirstRead) {
          // Wait for at least one chunk
          await new Promise((resolve) => {
            this._readableCallback = resolve
          })
          continue
        } else {
          break
        }
      }

      isFirstRead = false
      this._controller.enqueue(chunk)
    }
  }

  cancel () {
    this._destroy()
    this._nodeStream.destroy()
  }

  // Internal methods
  _onClose () {
    this._destroy()
    this._controller.close()
  }

  _onError (err) {
    this._destroy()
    this._controller.error(err)
  }

  _onReadable () {
    if (this._readableCallback) {
      this._readableCallback()
      this._readableCallback = null
    }
  }

  _destroy () {
    for (const [event, handler] of Object.entries(this._handlers)) {
      this._nodeStream.off(event, handler)
    }
  }
}

const nodeToWeb = (nodeStream) => {
  if (typeof ReadableStream === 'undefined') throw new Error('No web ReadableStream support')

  return new ReadableStream(new NodeToWebStreamSource(nodeStream))
}

module.exports = nodeToWeb
