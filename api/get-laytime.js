// api/get-laytime.js
export default async function handler(req, res) {
    // 限制只能用 POST 请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { imageBase64, systemPrompt } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: '没有提供图片数据' });
        }

        // 调用千问的视觉大模型 (OpenAI 兼容模式)
        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.QWEN_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'qwen-vl-max', // qwen-vl-max 是目前千问看图最强的模型
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: '请提取这张 SOF 上的时间线，并严格按要求输出 JSON 格式。' },
                            { type: 'image_url', image_url: { url: imageBase64 } }
                        ]
                    }
                ],
                // 强制要求模型输出 JSON 格式降低幻觉
                response_format: { type: "json_object" } 
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'API 请求失败');
        }

        // 解析千问返回的内容
        const aiContent = data.choices[0].message.content;
        
        // 尝试将返回的字符串解析为 JSON 对象
        const parsedData = JSON.parse(aiContent);
        
        // 为了兼容不同的 JSON 包装方式，提取出数组部分
        let resultArray = [];
        if (Array.isArray(parsedData)) {
            resultArray = parsedData;
        } else if (parsedData.data && Array.isArray(parsedData.data)) {
            resultArray = parsedData.data;
        } else {
            // 如果它返回了其他格式的对象，尝试提取其中的数组
            Object.values(parsedData).forEach(val => {
                if (Array.isArray(val)) resultArray = val;
            });
        }

        return res.status(200).json({ data: resultArray });

    } catch (error) {
        console.error('AI 提取错误:', error);
        return res.status(500).json({ error: error.message || '内部服务器错误' });
    }
}