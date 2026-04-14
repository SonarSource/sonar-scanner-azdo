/*
 * Azure DevOps extension for SonarQube
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

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
