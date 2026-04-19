---
name: ce-gemini-imagegen
description: 使用 Gemini API（Nano Banana Pro）生成與編輯圖片時使用。適用於從文字提示生成圖片、編輯既有圖片、套用風格轉換、生成含文字之標誌、建立貼圖、產品模型或任何圖片生成/操作任務。支援文字轉圖片、圖片編輯、多輪精煉及多張參考圖片之合成。
---

# Gemini 圖片生成（Nano Banana Pro）

使用 Google Gemini API 生成與編輯圖片。環境變數 `GEMINI_API_KEY` 必須已設定。

## 預設模型

| 模型 | 解析度 | 最適用途 |
|-------|------------|----------|
| `gemini-3-pro-image-preview` | 1K-4K | 所有圖片生成（預設） |

**注意：** 一律使用此 Pro 模型。僅在明確要求時方使用不同模型。

## 快速參照

### 預設設定
- **模型：** `gemini-3-pro-image-preview`
- **解析度：** 1K（預設，選項：1K, 2K, 4K）
- **寬高比：** 1:1（預設）

### 可用寬高比
`1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`4:5`、`5:4`、`9:16`、`16:9`、`21:9`

### 可用解析度
`1K`（預設）、`2K`、`4K`

## 核心 API 模式

```python
import os
from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

# Basic generation (1K, 1:1 - defaults)
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=["Your prompt here"],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
    ),
)

for part in response.parts:
    if part.text:
        print(part.text)
    elif part.inline_data:
        image = part.as_image()
        image.save("output.png")
```

## 自訂解析度與寬高比

```python
from google.genai import types

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[prompt],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(
            aspect_ratio="16:9",  # Wide format
            image_size="2K"       # Higher resolution
        ),
    )
)
```

### 解析度範例

```python
# 1K (default) - Fast, good for previews
image_config=types.ImageConfig(image_size="1K")

# 2K - Balanced quality/speed
image_config=types.ImageConfig(image_size="2K")

# 4K - Maximum quality, slower
image_config=types.ImageConfig(image_size="4K")
```

### 寬高比範例

```python
# Square (default)
image_config=types.ImageConfig(aspect_ratio="1:1")

# Landscape wide
image_config=types.ImageConfig(aspect_ratio="16:9")

# Ultra-wide panoramic
image_config=types.ImageConfig(aspect_ratio="21:9")

# Portrait
image_config=types.ImageConfig(aspect_ratio="9:16")

# Photo standard
image_config=types.ImageConfig(aspect_ratio="4:3")
```

## 編輯圖片

以文字提示傳入既有圖片：

```python
from PIL import Image

img = Image.open("input.png")
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=["Add a sunset to this scene", img],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
    ),
)
```

## 多輪精煉

使用聊天進行迭代編輯：

```python
from google.genai import types

chat = client.chats.create(
    model="gemini-3-pro-image-preview",
    config=types.GenerateContentConfig(response_modalities=['TEXT', 'IMAGE'])
)

response = chat.send_message("Create a logo for 'Acme Corp'")
# Save first image...

response = chat.send_message("Make the text bolder and add a blue gradient")
# Save refined image...
```

## 提示詞最佳實踐

### 寫實場景
包含相機細節：鏡頭類型、光線、角度、氛圍。
> "A photorealistic close-up portrait, 85mm lens, soft golden hour light, shallow depth of field"

### 風格化藝術
明確指定風格：
> "A kawaii-style sticker of a happy red panda, bold outlines, cel-shading, white background"

### 圖片中文字
明確說明字體風格與位置：
> "Create a logo with text 'Daily Grind' in clean sans-serif, black and white, coffee bean motif"

### 產品模型
描述光線設置與表面：
> "Studio-lit product photo on polished concrete, three-point softbox setup, 45-degree angle"

## 進階功能

### Google 搜尋接地
基於即時資料生成圖片：

```python
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=["Visualize today's weather in Tokyo as an infographic"],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        tools=[{"google_search": {}}]
    )
)
```

### 多張參考圖片（最多 14 張）
合併多個來源之元素：

```python
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[
        "Create a group photo of these people in an office",
        Image.open("person1.png"),
        Image.open("person2.png"),
        Image.open("person3.png"),
    ],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
    ),
)
```

## 重要：檔案格式與媒體類型

**關鍵：** Gemini API 預設以 JPEG 格式回傳圖片。儲存時一律使用 `.jpg` 副檔名以避免媒體類型不匹配。

```python
# CORRECT - Use .jpg extension (Gemini returns JPEG)
image.save("output.jpg")

# WRONG - Will cause "Image does not match media type" errors
image.save("output.png")  # Creates JPEG with PNG extension!
```

### 轉換為 PNG（若需要）

若確實需要 PNG 格式：

```python
from PIL import Image

# Generate with Gemini
for part in response.parts:
    if part.inline_data:
        img = part.as_image()
        # Convert to PNG by saving with explicit format
        img.save("output.png", format="PNG")
```

### 驗證圖片格式

以 `file` 指令檢查實際格式 vs. 副檔名：

```bash
file image.png
# If output shows "JPEG image data" - rename to .jpg!
```

## 備註

- 所有生成圖片含 SynthID 浮水印
- Gemini 預設回傳 **JPEG 格式** ——一律使用 `.jpg` 副檔名
- 僅圖片模式（`responseModalities: ["IMAGE"]`）不適用於 Google Search grounding
- 編輯時以對話方式描述變更——模型理解語義遮罩
- 預設 1K 解析度以求速度；品質關鍵時使用 2K/4K
