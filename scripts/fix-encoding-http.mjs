import http from "node:http";

function fetch(path) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:3000${path}`, (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            type: res.headers["content-type"],
            body: Buffer.concat(chunks),
          });
        });
      })
      .on("error", reject);
  });
}

const takaOk = Buffer.from([0xe0, 0xa7, 0xb3]);
const takaMoji = Buffer.from([0xc3, 0xa0, 0xc2, 0xa7, 0xc2, 0xb3]);

const paths = ["/", "/shop", "/admin/login", "/admin/settings/currency"];
for (const path of paths) {
  try {
    const { status, type, body } = await fetch(path);
    const text = body.toString("utf8");
    const charset = text.match(/charset=([^"'\\s>]+)/i);
    console.log(
      path,
      status,
      type,
      "charsetMeta",
      charset?.[1] ?? "none",
      "takaOk",
      body.includes(takaOk),
      "takaMoji",
      body.includes(takaMoji),
    );
  } catch (e) {
    console.log(path, "ERR", e.message);
  }
}
