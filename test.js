
const test = require('tape')
const PassThrough = require('readable-stream').PassThrough
const ReadableStream = require('readable-stream').Readable
const nodeToWebStream = require('.')

test('sanity check', function (t) {
  const str = 'foobar'
  streamToString(nodeToWebStream(stringToStream(str)))
    .then(output => {
      t.equal(str, output)
      t.end()
    })
    .catch(err => t.end(err))
})

test('cancel() ensures cleanup', function (t) {
  t.plan(1)
  const nodeStream = new ReadableStream({ read: function () {} })
  nodeStream._destroy = function () {
    t.pass('destroyed')
  }
  const webStream = nodeToWebStream(nodeStream)

  webStream.cancel()
})

test('cancel() ensures _destroy()', function (t) {
  t.plan(1)
  const nodeStream = new ReadableStream({ read: function () {} })
  const webStream = nodeToWebStream(nodeStream)

  nodeStream._destroy = function () {
    t.pass('destroyed')
  }

  webStream.cancel()
})

test('errored node stream', function (t) {
  t.plan(1)
  const nodeStream = new ReadableStream({ read: function () {} })
  const webStream = nodeToWebStream(nodeStream)

  nodeStream.emit('error', new Error('foobar'))

  webStream.getReader().read().catch(function (err) {
    t.equals(err.message, 'foobar')
  })
})

test('node stream closed early', function (t) {
  t.plan(1)
  const nodeStream = new ReadableStream({ read: function () {} })
  const webStream = nodeToWebStream(nodeStream)

  nodeStream.push(null)

  webStream.getReader().read().then(function (result) {
    t.equals(result.done, true)
  })
})

function stringToStream (str) {
  const s = new PassThrough()
  s.end(Buffer.from(str))
  return s
}

function streamToString (stream) {
  return new Promise(function (resolve, reject) {
    const reader = stream.getReader()
    let buffer = ''
    reader.read().then(onRead)

    function onRead (result) {
      if (result.done) return resolve(buffer)

      buffer += Buffer.from(result.value).toString()
      reader.read().then(onRead)
    }
  })
}
