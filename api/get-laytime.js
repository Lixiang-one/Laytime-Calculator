// api/get-laytime.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  // 接收前端发来的 text (文本) 和 images (图片数组)
  const { text, images } = req.body;
  const apiKey = process.env.GEMINI_API_KEY; 

  if (!apiKey) {
      return res.status(500).json({ error: '服务器未配置 API Key' });
  }

  try {
    // 组装发给 Gemini 的基础提示词
    let promptParts = [
      { text: "你是一个专业的航运 Laytime 结算助手。请阅读提供的 SOF 截图（可能有多页）或文本，按时间顺序梳理，提取所有关键事件的开始时间、结束时间和事件描述(REMARKS)。不要计算用时。请严格按 JSON 数组格式输出，包含字段：startTime, endTime, remarks。如果用户有额外说明请参考：" + (text || "无") }
    ];

    // 如果前端传来了图片数组，把每一张图片都加入到 promptParts 里
    if (images && images.length > 0) {
        images.forEach(img => {
            promptParts.push({
                inline_data: {
                    mime_type: img.mimeType,
                    data: img.base64
                }
            });
        });
    }

    // 呼叫 Gemini 1.5 Flash 模型
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
            parts: promptParts
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
       return res.status(500).json({ error: data.error.message });
    }

    const finalResult = data.candidates[0].content.parts[0].text;
    res.status(200).json({ result: finalResult });

  } catch (error) {
    res.status(500).json({ error: '请求 Gemini 接口失败，请检查网络或后端日志' });
  }
}