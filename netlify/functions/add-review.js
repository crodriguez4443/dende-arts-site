exports.handler = async function (event) {
  // Only accept POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // --- Parse the webhook payload ---
  // Netlify outgoing webhooks send JSON with form data inside a "data" property
  let formData;
  try {
    const payload = JSON.parse(event.body || "{}");
    formData = payload.data || payload;
    console.log("Received form data keys:", Object.keys(formData));
  } catch (e) {
    console.error("Failed to parse body:", e.message);
    return { statusCode: 400, body: "Invalid JSON body" };
  }

  const author = (formData.author || "").trim();
  const reviewScore = parseInt(formData.review_score || "0", 10);
  const reviewTitle = (formData.review_title || "").trim();
  const reviewContent = (formData.review_content || "").trim();
  const productTitle = (formData.product_title || "abada-joggers").trim();

  // Basic validation
  if (!author || !reviewScore || !reviewTitle || !reviewContent) {
    console.error("Missing fields:", { author, reviewScore, reviewTitle, reviewContent: reviewContent.substring(0, 20) });
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

  if (!token || !owner || !repo) {
    console.error("Missing env vars:", { hasToken: !!token, owner, repo });
    return { statusCode: 500, body: "Server misconfiguration: missing env vars" };
  }

  const filePath = "src/_data/abada-reviews.json";
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  console.log("GitHub API URL:", apiBase);

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
    const errText = await getRes.text();
    console.error("GitHub GET failed:", getRes.status, errText);
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
    const errText = await putRes.text();
    console.error("GitHub PUT failed:", putRes.status, errText);
    return { statusCode: 502, body: "Failed to commit review" };
  }

  console.log(`Review by "${author}" added to ${filePath}`);
  return { statusCode: 200, body: "Review added successfully" };
};
