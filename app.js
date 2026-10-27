import readline from 'node:readline/promises';
import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import dotenv from "dotenv";
dotenv.config();


const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tavilyKey = new tavily({ apiKey: process.env.TAVILY_API_KEY });


async function main() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    const messages = [
        {
            role: 'system',
            content: `You are a smart personal assistant who answers the asked questions.
                You have access to following tools:
                1. searchWeb({query}: {query: string}) //Search the latest information and realtime data on the internet.
                current date and time: ${new Date().toUTCString()}`,
        },
        // {
        //     role: 'user',
        //     content: 'What is the current weather in Mumbai?',
        //     // When was iphone 16 launched?
        //     // What is the current weather in Mumbai?
        // },
    ];

    while (true) {
        const question = await rl.question('You: ');
        // bye
        if (question === 'bye') {
            break;
        }

        messages.push({
            role: 'user',
            content: question,
        });

        while (true) {
            const completions = await groq.chat.completions.create({
                model: 'openai/gpt-oss-120b',
                temperature: 0,
                messages: messages,
                tools: [
                    {
                        type: 'function',
                        function: {
                            name: 'webSearch',
                            description:
                                'Search the latest information and realtime data on the internet.',
                            parameters: {
                                type: 'object',
                                properties: {
                                    query: {
                                        type: 'string',
                                        description: 'The search query to perform search on.',
                                    },
                                },
                                required: ['query'],
                            },
                        },
                    },
                ],
                tool_choice: 'auto',
            });

            messages.push(completions.choices[0].message);

            const toolCalls = completions.choices[0].message.tool_calls;

            if (!toolCalls) {
                console.log(`Assistant: ${completions.choices[0].message.content}`);
                break;
            }

            for (const tool of toolCalls) {
                // console.log('tool: ', tool);
                const functionName = tool.function.name;
                const functionParams = tool.function.arguments;

                if (functionName === 'webSearch') {
                    const toolResult = await webSearch(functionParams);
                    // const toolResult = await webSearch("What is current whether in delhi");
                    // console.log('Tool result: ', toolResult);

                    messages.push({
                        tool_call_id: tool.id,
                        role: 'tool',
                        name: functionName,
                        content: toolResult,
                    });
                }
            }
        }
    }

    rl.close();
}
main().catch(console.error);


async function webSearch(query) {

    console.log('Web search calling...');
    const tvly = tavily(tavilyKey);
    const response = await tvly.search(query);

    const result = response.results.map((result) => result.content).join('\n\n')
    console.log('32736572674', result);
    return result
}