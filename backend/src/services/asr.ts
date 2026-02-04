import * as tencentcloud from "tencentcloud-sdk-nodejs-asr";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const AsrClient = tencentcloud.asr.v20190614.Client;

const clientConfig = {
    credential: {
        secretId: process.env.TENCENT_SECRET_ID,
        secretKey: process.env.TENCENT_SECRET_KEY,
    },
    region: "ap-shanghai",
    profile: {
        httpProfile: {
            endpoint: "asr.tencentcloudapi.com",
        },
    },
};

const client = new AsrClient(clientConfig);

/**
 * 语音转文字服务 (ASR)
 * @param filePath 音频文件路径 (录音文件)
 * @returns 识别出的文字
 */
export async function transcribeAudio(filePath: string): Promise<string> {
    try {
        const audioData = fs.readFileSync(filePath);
        const base64Audio = audioData.toString("base64");

        const params = {
            EngineModelType: "16k_zh", // 16k 中文普通话
            EngSerViceType: "16k_zh",
            ChannelNum: 1,
            ResAudioFormat: "mp3",
            VoiceFormat: "mp3",
            SourceType: 1, // 1: base64, 0: url
            Data: base64Audio,
            DataLen: audioData.length,
            // 工业级优化：后续可以在腾讯云后台配置热词表后在此启用
            // HotwordId: "SITE_CONNECT_HOTWORDS", 
        };

        return new Promise((resolve, reject) => {
            client.SentenceRecognition(params, (err, response) => {
                if (err) {
                    console.error("Tencent ASR Error:", err);
                    return reject(err);
                }
                resolve(response.Result || "");
            });
        });
    } catch (error) {
        console.error("ASR Service Error:", error);
        throw error;
    }
}
