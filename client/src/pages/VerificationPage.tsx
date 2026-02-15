import { useCode } from "@/hooks/use-code";
import { GlassCard } from "@/components/GlassCard";
import { CountdownTimer } from "@/components/CountdownTimer";
import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw, ShieldCheck, ExternalLink } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";

export default function VerificationPage() {
  const { data, isLoading, error, refetch } = useCode();
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    if (!data?.code) return;

    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      
      // Celebration effect
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#a78bfa', '#c4b5fd'] // Violet shades
      });

      toast({
        title: "Copied to clipboard",
        description: "Paste this code into the Discord verification channel.",
        duration: 3000,
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Please copy the code manually.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="w-full max-w-md flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-muted-foreground animate-pulse">Generating secure code...</p>
        </GlassCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Service Unavailable</h2>
          <p className="text-muted-foreground mb-8">
            {(error as Error).message || "We couldn't generate a code at this time."}
          </p>
          <Button 
            onClick={() => refetch()} 
            variant="outline"
            className="w-full glass-button border-white/10 hover:bg-white/5"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=3000&auto=format&fit=crop')] bg-cover bg-center opacity-10 pointer-events-none" />
      
      <GlassCard className="w-full max-w-lg text-center backdrop-blur-2xl">
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center rotate-3 border border-primary/20 shadow-lg shadow-primary/20">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          Verify Access
        </h1>
        
        <p className="text-lg text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
          Your unique verification code is ready. Use this to unlock full access to the Discord server.
        </p>

        <div className="relative group mb-8">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-black/40 border border-primary/20 rounded-2xl p-6 md:p-8 flex flex-col items-center gap-4">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary/70">
              One-Time Code
            </span>
            <div className="font-mono text-3xl md:text-5xl font-bold text-white tracking-wider text-glow select-all">
              {data?.code}
            </div>
            
            <div className="w-full border-t border-white/5 my-2" />
            
            {data && <CountdownTimer expiresAt={data.expiresAt} />}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Button
            size="lg"
            onClick={handleCopy}
            className={`
              relative overflow-hidden transition-all duration-300 h-14 text-lg font-medium
              ${copied 
                ? "bg-green-500/20 text-green-400 border-green-500/20 hover:bg-green-500/30" 
                : "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5"
              }
            `}
          >
            <div className="relative z-10 flex items-center gap-2">
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    <span>Copied!</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Copy className="w-5 h-5" />
                    <span>Copy Code</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Button>

          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-white hover:bg-white/5 h-12"
            onClick={() => window.open("https://discord.com", "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Discord
          </Button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground/60">
          This code expires automatically. If it expires, simply refresh the page to generate a new one.
        </p>
      </GlassCard>
    </div>
  );
}
