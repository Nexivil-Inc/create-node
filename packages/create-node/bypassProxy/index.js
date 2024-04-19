const https = require("https");

function isEmpty(object) {
  for (let prop in object) {
    if (object.hasOwnProperty(prop)) return false;
  }

  return true;
}

function pemEncode(str, n) {
  const ret = [];

  for (let i = 1; i <= str.length; i++) {
    ret.push(str[i - 1]);
    const mod = i % n;

    if (mod === 0) {
      ret.push("\n");
    }
  }

  const returnString = `-----BEGIN CERTIFICATE-----\n${ret.join(
    ""
  )}\n-----END CERTIFICATE-----`;

  return returnString;
}

function getOptions(url, port, protocol) {
  return {
    hostname: url,
    agent: false,
    rejectUnauthorized: false,
    ciphers: "ALL",
    port,
    protocol,
  };
}

function validateUrl(url) {
  if (url.length <= 0 || typeof url !== "string") {
    throw Error("A valid URL is required");
  }
}

function handleRequest(options, detailed = false, resolve, reject) {
  return https.get(options, function (res) {
    const certificate = res.socket.getPeerCertificate(detailed);

    if (isEmpty(certificate) || certificate === null) {
      reject({ message: "The website did not provide a certificate" });
    } else {
      if (certificate.raw) {
        certificate.pemEncoded = pemEncode(
          certificate.raw.toString("base64"),
          64
        );
      }
      resolve(certificate);
    }
  });
}

function get(url, timeout, port, protocol, detailed) {
  validateUrl(url);

  port = port || 443;
  protocol = protocol || "https:";

  const options = getOptions(url, port, protocol);

  return new Promise(function (resolve, reject) {
    const req = handleRequest(options, detailed, resolve, reject);

    if (timeout) {
      req.setTimeout(timeout, function () {
        reject({ message: "Request timed out." });
        req.destroy();
      });
    }

    req.on("error", function (e) {
      reject(e);
    });

    req.end();
  });
}

module.exports = {
  get: get,
};
