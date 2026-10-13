using CrmAppointza.Models.CrmAppointza;

namespace CrmAppointza.AiModel
{
    public class OllamaSettings
    {
        public string BaseUrl { get; set; } = "http://localhost:11434";
        public string Model { get; set; } = "qwen3:4b";
        public string EmbeddingModel { get; set; } = "nomic-embed-text";
        public int TimeoutSeconds { get; set; } = 300;
        public double Temperature { get; set; } = 0.4;
        /// <summary>Layers offloaded to GPU. 0 = CPU only, null = Ollama decides.</summary>
        public int? NumGpu { get; set; }
    }

    public class AiHealthRes
    {
        public bool available { get; set; }
        public string baseUrl { get; set; }
        public string defaultModel { get; set; }
        public bool defaultModelInstalled { get; set; }
        public List<string> models { get; set; } = new();
        public string error { get; set; }
    }

    public class AiChatReq
    {
        public string prompt { get; set; }
        public string systemPrompt { get; set; }
        public string model { get; set; }
        public Lead lead { get; set; }
    }

    public class AiChatRes
    {
        public string reply { get; set; }
        public string model { get; set; }
        public long durationMs { get; set; }
    }
}
