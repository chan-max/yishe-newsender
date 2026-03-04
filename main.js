const axios = require('axios');
const chalk = require('chalk');
const https = require('https');
const OpenAI = require('openai');
const CONFIG = require('./config');
const PLATFORMS = require('./platforms');

// 用户代理池
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0'
];

// 初始化 AI 客户端
let aiClient = null;
if (CONFIG.ai && CONFIG.ai.enabled) {
    try {
        aiClient = new OpenAI({
            apiKey: CONFIG.ai.apiKey,
            baseURL: CONFIG.ai.baseURL
        });
        console.log(chalk.green('✅ AI 客户端初始化成功'));
    } catch (error) {
        console.log(chalk.yellow('⚠️  AI 客户端初始化失败，将跳过 AI 整理功能'));
    }
}

/**
 * 使用 AI 整理热搜数据
 * @param {string} rawMessage - 原始消息内容
 * @returns {Promise<string>} - 整理后的消息
 */
async function organizeWithAI(rawMessage) {
    if (!CONFIG.ai || !CONFIG.ai.enabled || !aiClient) {
        return rawMessage;
    }

    try {
        console.log(chalk.blue('🤖 正在使用 AI 整理热搜数据...'));

        const prompt = `请对以下热搜数据进行整理，要求：
    1. 输出为纯文本，不要使用 Markdown 或任何标记语法
    2. 保持原有的平台分类结构和顺序
    3. 尽量保留原始消息内容，不要过度改写或总结
    4. 仅做必要的轻微整理，减少信息冗余，便于直接阅读
    5. 保持原有的时间戳和统计信息

    热搜数据：
    ${rawMessage}`;

        const response = await aiClient.chat.completions.create({
            model: CONFIG.ai.modelName,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: CONFIG.ai.maxTokens,
            temperature: CONFIG.ai.temperature
        });

        const organizedMessage = response.choices[0].message.content;
        console.log(chalk.green('✅ AI 整理完成'));
        return organizedMessage;
    } catch (error) {
        console.log(chalk.yellow(`⚠️  AI 整理失败: ${error.message}，使用原始数据`));
        return rawMessage;
    }
}

/**
 * 发送消息到飞书机器人
 * @param {string} content - 文本内容
 */
async function sendToFeishu(content) {
    try {
        const body = {
            msg_type: 'text',
            content: {
                text: content
            }
        };
        
        const res = await axios.post(CONFIG.feishuWebhook, body, {
            headers: {
                'Content-Type': 'application/json'
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
        });
        
        if (res.data && res.data.code === 0) {
            console.log(chalk.green('✅ 飞书推送成功'));
            return true;
        } else {
            console.log(chalk.red('❌ 飞书推送失败：'), res.data);
            return false;
        }
    } catch (err) {
        console.log(chalk.red('❌ 飞书推送异常：'), err.message);
        return false;
    }
}

/**
 * 热搜爬虫类
 */
class HotSearchCrawler {
    constructor() {
        this.results = {};
        this.errors = [];
        this.startTime = Date.now();
    }

    // 随机获取用户代理
    getRandomUserAgent() {
        return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    }

    // 创建axios实例
    createAxiosInstance() {
        return axios.create({
            timeout: CONFIG.timeout,
            headers: {
                'User-Agent': this.getRandomUserAgent(),
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive'
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
        });
    }

    // 带重试的请求
    async requestWithRetry(url, options = {}, retryTimes = CONFIG.retryTimes) {
        const axiosInstance = this.createAxiosInstance();

        for (let i = 0; i <= retryTimes; i++) {
            try {
                const response = await axiosInstance.get(url, options);
                return response.data;
            } catch (error) {
                if (i === retryTimes) {
                    throw error;
                }
                console.log(chalk.yellow(`请求失败，${CONFIG.retryDelay}ms后重试 (${i + 1}/${retryTimes + 1})`));
                await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
            }
        }
    }

    // 获取单个平台的热搜数据
    async fetchPlatformData(platformKey, platformConfig) {
        if (!platformConfig.enabled || !platformConfig.url) {
            return null;
        }

        try {
            console.log(chalk.blue(`正在获取 ${platformConfig.name} 热搜数据...`));

            const data = await this.requestWithRetry(platformConfig.url, {
                headers: platformConfig.headers
            });

            // 使用解析函数处理数据
            if (platformConfig.parser && typeof platformConfig.parser === 'function') {
                const parsedData = platformConfig.parser(data);
                return {
                    platform: platformKey,
                    name: platformConfig.name,
                    data: parsedData,
                    timestamp: new Date().toISOString(),
                    success: true
                };
            } else {
                return {
                    platform: platformKey,
                    name: platformConfig.name,
                    data: data,
                    timestamp: new Date().toISOString(),
                    success: true
                };
            }
        } catch (error) {
            const errorInfo = {
                platform: platformKey,
                name: platformConfig.name,
                error: error.message,
                timestamp: new Date().toISOString(),
                success: false
            };
            this.errors.push(errorInfo);
            console.log(chalk.red(`获取 ${platformConfig.name} 数据失败: ${error.message}`));
            return errorInfo;
        }
    }

    // 获取所有平台的热搜数据
    async fetchAllPlatforms() {
        console.log(chalk.green('开始获取热搜数据...'));

        const promises = Object.entries(PLATFORMS).map(([key, config]) =>
            this.fetchPlatformData(key, config)
        );

        const results = await Promise.all(promises);

        // 过滤掉null结果并存储
        this.results = results.filter(result => result !== null);
        
        // 转换为对象格式便于访问
        const resultsObj = {};
        this.results.forEach(result => {
            if (result && result.platform) {
                resultsObj[result.platform] = result;
            }
        });

        return resultsObj;
    }

    // 格式化消息内容
    formatMessage() {
        const time = new Date().toLocaleString('zh-CN');
        let message = `📊 热搜榜单 - ${time}\n\n`;

        // 平台配置映射
        const platformConfigs = [
            {
                key: 'weibo',
                label: '微博热搜',
                getTitle: item => item.title || '未知',
                getHot: item => item.hot || ''
            },
            {
                key: 'douyin',
                label: '抖音热搜',
                getTitle: item => item.title || '未知',
                getHot: item => item.hot || ''
            },
            {
                key: 'zhihu',
                label: '知乎热搜',
                getTitle: item => item.title || '未知',
                getHot: item => item.hot || ''
            },
            {
                key: 'bilibili',
                label: 'Bilibili热搜',
                getTitle: item => item.title || '未知',
                getHot: item => item.hot || ''
            },
            {
                key: 'ks',
                label: '快手热搜',
                getTitle: item => item.name || item.title || '未知',
                getHot: item => item.hot || ''
            },
            {
                key: 'toutiao',
                label: '今日头条热搜',
                getTitle: item => item.title || '未知',
                getHot: item => item.hot || ''
            },
            {
                key: 'douban',
                label: '豆瓣热搜',
                getTitle: item => item.title || '未知',
                getHot: item => item.hot || ''
            }
        ];

        let successCount = 0;

        for (const pf of platformConfigs) {
            const result = this.results.find(r => r.platform === pf.key && r.success);
            if (result && Array.isArray(result.data) && result.data.length > 0) {
                successCount++;
                message += `【${pf.label}】\n`;
                result.data.forEach((item, idx) => {
                    const hot = pf.getHot(item);
                    const hotText = hot ? ` (${hot})` : '';
                    const title = pf.getTitle(item);
                    message += `${idx + 1}. ${title}${hotText}\n`;
                });
                message += '\n';
            }
        }

        if (successCount === 0) {
            message += '⚠️ 暂无可用数据\n';
        }

        message += `\n获取耗时: ${Date.now() - this.startTime}ms`;
        message += `\n成功: ${this.results.filter(r => r.success).length} 个平台`;
        if (this.errors.length > 0) {
            message += `\n失败: ${this.errors.length} 个平台`;
        }

        return message;
    }

    // 发送到飞书（使用 AI 整理，如果启用）
    async sendToFeishu() {
        console.log(chalk.blue('📤 开始发送飞书消息...'));
        let message = this.formatMessage();
        
        // 使用 AI 整理消息
        if (CONFIG.ai && CONFIG.ai.enabled) {
            message = await organizeWithAI(message);
        }
        
        const success = await sendToFeishu(message);
        return success;
    }

    // 发送原始消息到飞书（不使用 AI）
    async sendToFeishuRaw() {
        console.log(chalk.blue('📤 开始发送原始飞书消息（不使用 AI）...'));
        const message = this.formatMessage();
        const success = await sendToFeishu(message);
        return success;
    }

    // 主运行函数
    async run() {
        try {
            await this.fetchAllPlatforms();
            
            // 输出到控制台
            console.log(chalk.green('\n=== 热搜数据汇总 ==='));
            console.log(chalk.gray(`获取时间: ${new Date().toLocaleString('zh-CN')}`));
            console.log(chalk.gray(`总耗时: ${Date.now() - this.startTime}ms`));
            console.log(chalk.gray(`成功: ${this.results.filter(r => r.success).length} 个平台`));
            console.log(chalk.gray(`失败: ${this.errors.length} 个平台\n`));

            // 发送到飞书
            await this.sendToFeishu();

            console.log(chalk.green('\n✅ 热搜数据获取完成！'));
        } catch (error) {
            console.error(chalk.red('❌ 运行失败:'), error.message);
            process.exit(1);
        }
    }
}

// 如果直接运行此文件
if (require.main === module) {
    const crawler = new HotSearchCrawler();
    crawler.run();
}

module.exports = HotSearchCrawler;
