const openpgp = require("openpgp");
const through = require("through2");
const Vinyl = require("vinyl");
const Stream = require("stream");

exports.getSignature = (opts = {}) => {
  function transform(file, encoding, callback) {
    if (file.isNull()) {
      this.push(file);
      callback();
      return;
    }

    let stream;
    if (file.isBuffer() && !file.pipe) {
      stream = new Stream.PassThrough().end(file.contents);
    } else {
      stream = file;
    }

    sign(stream, opts.privateKeyArmored, opts.passphrase).then((signature) => {
      this.push(
        new Vinyl({
          cwd: file.cwd,
          base: file.base,
          path: file.path + ".asc",
          contents: signature,
        }),
      );
      callback();
    });
  }

  return through.obj(transform);
};

async function sign(content, privateKeyArmored, passphrase) {
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyArmored }),
    passphrase,
  });
  const message = await openpgp.createMessage({ binary: content });
  return await openpgp.sign({
    message,
    signingKeys: privateKey,
    detached: true,
  });
}
