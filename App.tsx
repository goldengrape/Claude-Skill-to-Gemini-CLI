import React, { useState, useCallback, useMemo } from 'react';
import { processZipFile, createContextBlob, generateAndDownloadZip } from './services/compiler';
import { compileSkillWithGemini } from './services/gemini';
import type { AppStatus } from './types';

const UploadIcon = () => (
  <svg className="w-10 h-10 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
  </svg>
);

const CheckCircleIcon = () => (
    <svg className="w-16 h-16 text-green-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
);

const ExclamationTriangleIcon = () => (
    <svg className="w-16 h-16 text-red-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
    </svg>
);

export default function App() {
    const [commandName, setCommandName] = useState<string>('/my-skill');
    const [zipFile, setZipFile] = useState<File | null>(null);
    const [status, setStatus] = useState<AppStatus>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [dragActive, setDragActive] = useState(false);

    const handleReset = () => {
        setCommandName('/my-skill');
        setZipFile(null);
        setStatus('idle');
        setErrorMessage('');
    };
    
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!zipFile || !commandName) {
            setErrorMessage('Please provide a command name and a .zip file.');
            setStatus('error');
            return;
        }
        if (!commandName.startsWith('/')) {
            setErrorMessage('Command name must start with a "/"');
            setStatus('error');
            return;
        }

        setStatus('processing');
        setErrorMessage('');

        try {
            const skillData = await processZipFile(zipFile);
            const contextBlob = createContextBlob(skillData);
            const tomlContent = await compileSkillWithGemini(contextBlob);
            await generateAndDownloadZip(tomlContent, commandName);
            setStatus('success');
        } catch (error) {
            const err = error as Error;
            console.error(err);
            setErrorMessage(err.message || 'An unknown error occurred.');
            setStatus('error');
        }
    }, [zipFile, commandName]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setZipFile(e.target.files[0]);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };
    
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setZipFile(e.dataTransfer.files[0]);
        }
    };

    const isProcessing = status === 'processing';

    const renderContent = () => {
        switch (status) {
            case 'processing':
                return (
                    <div className="text-center py-12">
                         <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto"></div>
                         <p className="mt-4 text-lg text-gray-300">Compiling your skill...</p>
                         <p className="text-sm text-gray-500">This may take a moment. The AI is refactoring the code.</p>
                    </div>
                );
            case 'success':
                return (
                    <div className="text-center py-12">
                        <CheckCircleIcon />
                        <h3 className="mt-4 text-2xl font-semibold text-white">Compilation Successful!</h3>
                        <p className="mt-2 text-gray-400">Your download has started. Check your browser for the generated .zip file.</p>
                        <div className="mt-4 text-left bg-gray-900/50 border border-gray-700 rounded-lg p-4 max-w-md mx-auto">
                            <h4 className="font-semibold text-gray-200">Next Steps:</h4>
                            <ol className="list-decimal list-inside text-gray-400 text-sm mt-2 space-y-1">
                                <li>Unzip the downloaded file.</li>
                                <li>You will find a <code className="bg-gray-700 p-1 rounded text-xs">.toml</code> file and a <code className="bg-gray-700 p-1 rounded text-xs">README.md</code>.</li>
                                <li>Follow the instructions in <strong className="text-purple-400">README.md</strong> to install your new command in Gemini CLI.</li>
                            </ol>
                        </div>
                         <button
                            onClick={handleReset}
                            className="mt-8 px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors"
                        >
                            Compile Another Skill
                        </button>
                    </div>
                );
            case 'error':
                 return (
                    <div className="text-center py-12">
                        <ExclamationTriangleIcon />
                        <h3 className="mt-4 text-2xl font-semibold text-white">An Error Occurred</h3>
                        <p className="mt-2 text-red-400 bg-red-900/20 p-3 rounded-md">{errorMessage}</p>
                         <button
                            onClick={handleReset}
                            className="mt-6 px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                );
            case 'idle':
            default:
                return (
                    <>
                        <div className="mb-6 bg-gray-800/80 border border-gray-700 rounded-lg p-4 text-sm text-gray-400 space-y-2">
                            <h3 className="font-semibold text-gray-200 text-base">Instructions:</h3>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Prepare your Claude Skill in a single directory containing `SKILL.MD` and any resource files.</li>
                                <li>Compress this entire directory into a <strong className="text-purple-400">.zip</strong> file.</li>
                                <li>Upload the zip file below to compile it into a Gemini CLI command.</li>
                            </ol>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="command-name" className="block text-sm font-medium text-gray-300">
                                    1. Desired Gemini CLI Command Name
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        id="command-name"
                                        value={commandName}
                                        onChange={(e) => setCommandName(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="/your-skill-name"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300">
                                    2. Upload Claude Skill (.zip)
                                </label>
                                <div 
                                    onDragEnter={handleDrag}
                                    onDragOver={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDrop={handleDrop}
                                    className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${dragActive ? 'border-purple-500' : 'border-gray-600'} border-dashed rounded-md transition-colors`}>
                                    <div className="space-y-1 text-center">
                                        <UploadIcon />
                                        {zipFile ? (
                                            <p className="text-green-400 font-semibold">{zipFile.name}</p>
                                        ) : (
                                            <>
                                                <div className="flex text-sm text-gray-400">
                                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-purple-400 hover:text-purple-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-purple-500 px-1">
                                                        <span>Upload a file</span>
                                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".zip" onChange={handleFileChange}/>
                                                    </label>
                                                    <p className="pl-1">or drag and drop</p>
                                                </div>
                                                <p className="text-xs text-gray-500">ZIP up to 10MB</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={!zipFile || !commandName || isProcessing}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 transition-all"
                                >
                                    {isProcessing ? 'Processing...' : 'Compile Skill'}
                                </button>
                            </div>
                        </form>
                    </>
                );
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-2xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                        SkillCompiler
                    </h1>
                    <p className="mt-2 text-lg text-gray-400">
                        Convert Anthropic Claude skills to Gemini CLI commands instantly.
                    </p>
                </header>

                <main className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl shadow-purple-900/20">
                     <div className="p-6 sm:p-8">
                        {renderContent()}
                    </div>
                </main>
                
                 <footer className="text-center mt-8 text-sm text-gray-500">
                    <p>Powered by Google Gemini</p>
                </footer>
            </div>
        </div>
    );
}