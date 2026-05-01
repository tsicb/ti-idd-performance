const CSV_OBJECT_KEY = "data.csv";

export async function onRequestGet(context) {
  const { env, request } = context;

  try {
    if (!env.DATA_BUCKET) {
      return new Response("R2 binding DATA_BUCKET is not configured.", {
        status: 500,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      });
    }

    const object = await env.DATA_BUCKET.get(CSV_OBJECT_KEY);

    if (object === null) {
      return new Response(`R2 object not found: ${CSV_OBJECT_KEY}`, {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    const headers = new Headers();

    // R2に保存されているHTTPメタデータがあれば反映
    object.writeHttpMetadata(headers);

    // CSVとして返す
    headers.set("content-type", "text/csv; charset=utf-8");

    // 同じユーザーの再読み込みを少し軽くするためのブラウザキャッシュ
    // セキュア運用を優先し、共有キャッシュではなくprivateにしています
    headers.set("cache-control", "private, max-age=3600");

    // ブラウザの条件付きリクエスト用
    if (object.httpEtag) {
      headers.set("etag", object.httpEtag);

      const ifNoneMatch = request.headers.get("if-none-match");
      if (ifNoneMatch === object.httpEtag) {
        return new Response(null, {
          status: 304,
          headers,
        });
      }
    }

    return new Response(object.body, {
      status: 200,
      headers,
    });

  } catch (error) {
    return new Response(`Failed to load CSV from R2: ${error.message}`, {
      status: 500,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
}
