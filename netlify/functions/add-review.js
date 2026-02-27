const crypto = require("crypto");

// Netlify Background Functions must export a handler
exports.handler = async function (event) {
  // Only accept POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // --- Signature verification ---
  const secret = process.env.NETLIFY_WEBHOOK_SECRET;
  if (secret) {
    const signature = event.headers["x-webhook-signature"] || "";
    const expected =
      "sha256=" +
      crypto
        .createHmac("sha256", secret)
        .update(event.body || "")
        .digest("hex");
    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      )
    ) {
      return { statusCode: 401, body: "Unauthorized" };
    }
  }

  // --- Parse form-encoded body ---
  const params = new URLSearchParams(event.body || "");
  const author = (params.get("author") || "").trim();
  const reviewScore = parseInt(params.get("review_score") || "0", 10);
  const reviewTitle = (params.get("review_title") || "").trim();
  const reviewContent = (params.get("review_content") || "").trim();
  const productTitle = (params.get("product_title") || "abada-joggers").trim();

  // Basic validation
  if (!author || !reviewScore || !reviewTitle || !reviewContent) {
    return { statusCode: 400, body: "Missing required fields" };
  }
  if (reviewScore < 1 || reviewScore > 5) {
    return { statusCode: 400, body: "review_score must be 1-5" };
  }

  // --- Build new review object ---
  const today = new Date().toISOString().split("T")[0];
  const newReview = {
    product_title: productTitle,
    date: today,
    review_content: reviewContent,
    review_score: reviewScore,
    review_title: reviewTitle,
    user_type: "Verified Buyer",
    author: author,
  };

  // --- GitHub API ---
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const filePath = "src/_data/abada-reviews.json";
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": "netlify-add-review-function",
  };

  // Fetch current file
  const getRes = await fetch(apiBase, { headers });
  if (!getRes.ok) {
    console.error("GitHub GET failed:", await getRes.text());
    return { statusCode: 502, body: "Failed to fetch reviews file" };
  }
  const fileData = await getRes.json();
  const sha = fileData.sha;
  const currentContent = JSON.parse(
    Buffer.from(fileData.content, "base64").toString("utf-8")
  );

  // Prepend new review
  currentContent["abada-reviews"].unshift(newReview);

  // Commit updated file
  const updatedContent = Buffer.from(
    JSON.stringify(currentContent, null, 4)
  ).toString("base64");

  const putRes = await fetch(apiBase, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `Add review by ${author} for ${productTitle}`,
      content: updatedContent,
      sha: sha,
    }),
  });

  if (!putRes.ok) {
    console.error("GitHub PUT failed:", await putRes.text());
    return { statusCode: 502, body: "Failed to commit review" };
  }

  console.log(`Review by "${author}" added to ${filePath}`);
  return { statusCode: 200, body: "Review added successfully" };
};
