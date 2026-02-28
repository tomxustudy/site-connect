import * as tencentcloud from "tencentcloud-sdk-nodejs-asr";
import fs from "fs";
import dotenv from "dotenv";
import { exec } from "child_process";
import path from "path";

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

function convertToWav(inputPath: string): Promise<string> {
    const outputPath = inputPath + '.wav';
    return new Promise((resolve, reject) => {
        // 强制转为 16k 采样率, 单声道, pcm_s16le (WAV标准)
        // -t 60: 限制最大时长为60秒 (腾讯云ASR限制)
        const cmd = `ffmpeg -y -i "${inputPath}" -t 60 -ac 1 -ar 16000 -f wav "${outputPath}"`;
        console.log(`[ASR] Converting audio`);
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`[ASR] FFmpeg Error: ${error.message}`);
                return reject(error);
            }
            resolve(outputPath);
        });
    });
}

export async function transcribeAudio(filePath: string): Promise<string> {
    let targetPath = filePath;
    let cleanupNeeded = false;

    try {
        console.log(`[ASR] Processing file: ${filePath}`);

        // 1. 自动转换格式 (确保兼容 WebM, AAC, MP3 等)
        targetPath = await convertToWav(filePath);
        cleanupNeeded = true;

        // 2. 读取转换后的 WAV
        const audioData = fs.readFileSync(targetPath);
        const base64Audio = audioData.toString("base64");

        console.log(`[ASR] Converted WAV size: ${audioData.length}`);

        const params = {
            EngSerViceType: "16k_zh",
            SourceType: 1,
            VoiceFormat: "wav", // 强制指定 WAV
            Data: base64Audio,
            DataLen: audioData.length,
        };

        return new Promise((resolve, reject) => {
            console.log("[ASR] Requesting Tencent Cloud...");
            client.SentenceRecognition(params, (err: any, response) => {
                if (err) {
                    console.error("[ASR] Tencent API Error:", err.message || err);
                    return reject(err);
                }
                console.log("[ASR] Tencent API Success");
                resolve(response.Result || "");
            });
        });
    } catch (error: any) {
        console.error("[ASR] Service Error:", error.message || error);
        throw error;
    } finally {
        if (cleanupNeeded && targetPath !== filePath) {
            fs.unlink(targetPath, () => { }); // 异步删除临时文件
        }
    }
}
