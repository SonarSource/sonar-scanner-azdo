const openpgp = require('openpgp');
const through = require('through2');
const Vinyl = require('vinyl')
const Stream = require('stream');
const path = require('path');

exports.getSignature = (opts = {}) => {
    return through.obj(getTransform(opts, false))
}

exports.addSignature = (opts = {}) => {
    return through.obj(getTransform(opts, true))
};

function getTransform(opts, keep) {
    return function transform(file, encoding, callback) {
        if (file.isNull()) {
            this.push(file)
            return callback()
        }

        let stream = new Stream.PassThrough()

        if (file.isBuffer() && !file.pipe) {
            stream.end(file.contents)
        } else {
            stream = file
        }

        sign(stream, opts.privateKeyArmored, opts.passphrase).then(signature => {
            this.push(new Vinyl({
                cwd: file.cwd,
                base: file.base,
                path: file.path + ".asc",
                contents: signature
            }))
            if(keep) this.push(file)
            callback()
        })
    }
}

async function sign(content, privateKeyArmored, passphrase) {
    const privateKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyArmored }),
        passphrase
    });
    const message = await openpgp.createMessage({ binary: content })
    return await openpgp.sign({
        message,
        signingKeys: privateKey,
        detached: true
    })
}
