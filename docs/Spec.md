# Role & Context
你是一位精通 AI Agent 架構與後端工程的資深架構師。我們目前需要對 GitHub 開源專案 `tommy771004/Javis` 進行底層架構的全面升級。
目標：將 Javis 從單純的「對話機器人」，重構為具備「ReAct 推理能力」、「多智能體協作」與「Harness 工程防護網」的高可用性、高穩定性 AI Agent 系統。

# Core Requirements (核心升級需求)
請仔細閱讀以下架構設計模式（這些是解決 AI 不穩定性的實戰痛點），並在後續的程式碼重構規劃中嚴格落實：

## 模組一：Agent 核心大腦 (The Brain)
1. **決策模式融合 (ReAct + Plan-and-Execute)：**
   - 實作完整的 `Think -> Act -> Observe` (思考->行動->觀察) 迴圈機制。
   - 對於複雜任務，系統需具備「先規劃、再執行」的清單拆解能力。
2. **上下文視窗管理 (Context Window Management)：**
   - 必須實作「記憶壓縮 / 摘要」機制。當對話歷史 (Token) 接近大模型處理上限時，系統需自動將舊對話總結為摘要 (Summary)，替換掉冗長的原始對話，確保工作空間不會溢位。
3. **多智能體協作 (Multi-Agent) (可擴充架構)：**
   - 預留 Manager (專案經理) 與 Worker (執行者) 的分離介面。Manager 負責拆解需求並分配工作，Worker 負責持有獨立的上下文來執行具體工具，最後由 Manager 統整結果（避免單一 AI 處理過多資訊導致混亂）。

## 模組二：Harness 工程防護網 (The Safety Net) - [本次重構重點]
大模型本身不可靠，不能盲目信任其輸出的結果。必須透過程式碼在 AI 外圍包裝一層 `Harness` (防護網) 中介軟體，攔截所有 I/O 錯誤。請確保實作以下 5 道防線：
1. **輸入與輸出過濾 (I/O Filtering)：**
   - **輸入：** 檢測 Prompt Injection (提示詞注入攻擊) 或可疑的指令注入。
   - **輸出：** 建立敏感詞與異常結果過濾，避免系統直接吐出違規內容。
2. **格式清洗 (Format Cleaning)：**
   - AI 常會輸出廢話（如「好的，我幫您搜一下...」）或套上 Markdown 標籤（如 ```json ... ```）。
   - **實作要求：** 撰寫強健的 Regex / 字串清洗模組，強制剝離頭尾廢話與 Markdown 標籤，處理結尾多餘換行，確保 Parse JSON 前的字串是 100% 乾淨的。若漏引號需能嘗試修復。
3. **工具參數校驗 (Parameter Validation)：**
   - 呼叫外部工具 API 前，必須實作強型別與邏輯校驗。例如：限制 `year` 參數必須是 1900-2026 的整數（防範 AI 亂填「1980年代」文字），限制 `city` 必須在合法清單內。
4. **錯誤重試迴圈 (Error Retry Loop)：**
   - 當格式清洗失敗或參數校驗不通過時，系統**絕對不可直接 Crash**。
   - 必須捕捉 Exception，將錯誤原因（如：JSON 格式錯誤、參數越界）組裝成系統提示詞，打回給大模型，讓其「重新修正並生成 (Retry)」。
5. **代碼兜底/直接堵死 (Hardcode Fallback)：**
   - 若發現 AI 頻繁犯相同的錯誤（光靠修改 System Prompt 根本沒用時），請在程式碼後端實作直接覆寫 (Override) 邏輯，用 Code 強制修正錯誤結果，確保最終產出穩定。

# Action Items (請依序執行以下任務)
1. **架構設計圖：** 請使用 Mermaid 語法繪製 Javis 的新資料流架構圖，必須清晰呈現 `User -> Input Filter -> Agent -> Harness (Format Cleaner, Validator, Retry Loop) -> Tools -> Output Filter -> User` 的完整流轉過程。
2. **Harness 核心程式碼實作：** 請以 Javis 專案適用的程式語言 (如 Python / Node.js)，撰寫 `AgentHarness` 的基礎類別實作。程式碼必須包含上述的 Format Cleaner、Validator 與 Retry Loop 核心邏輯。
3. **Javis 重構落地計畫：** 針對 `tommy771004/Javis` 專案，列出要套用此新架構的「前 3 個具體重構步驟」，並說明應如何安全地將 Harness 邏輯無縫串接進現有的機器人呼叫流程中。