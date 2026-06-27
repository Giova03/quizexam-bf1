"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Heart,
  MessageCircle,
  Send,
  Users,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import { usePrefs } from "@/lib/prefs-store";

interface Post {
  id: string;
  content: string;
  type: string;
  likesCount: number;
  createdAt: string;
  author: { id: string; name: string };
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; name: string };
  }>;
  likes: { userId: string }[];
}

export function SocialView() {
  const { data: session } = useSession();
  const recordPost = usePrefs((s) => s.recordPost);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [postType, setPostType] = useState("discussion");
  const [submitting, setSubmitting] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social/posts");
      if (res.ok) setPosts(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  async function createPost() {
    if (!newPost.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPost, type: postType }),
      });
      if (res.ok) {
        const post = await res.json();
        setPosts((prev) => [post, ...prev]);
        setNewPost("");
        toast.success("Publication partagée !");
        // Track for social-butterfly badge (10 posts).
        recordPost();
      } else {
        toast.error("Échec de la publication");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLike(postId: string) {
    if (!session?.user) {
      toast.error("Connectez-vous pour aimer");
      return;
    }
    const res = await fetch(`/api/social/posts/${postId}/like`, {
      method: "POST",
    });
    if (res.ok) {
      const { liked } = await res.json();
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                likesCount: liked ? p.likesCount + 1 : p.likesCount - 1,
                likes: liked
                  ? [...p.likes, { userId: "me" }]
                  : p.likes.filter((l) => l.userId !== "me"),
              }
            : p
        )
      );
    }
  }

  async function addComment(postId: string) {
    const content = commentInputs[postId];
    if (!content?.trim()) return;
    const res = await fetch(`/api/social/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const comment = await res.json();
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
        )
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    }
  }

  const userId = (session?.user as { id?: string })?.id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="h-6 w-6 text-violet-600" />
          Communauté
        </h1>
        <p className="text-muted-foreground">
          Échangez, posez vos questions et partagez avec la communauté
        </p>
      </div>

      {session?.user ? (
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              { type: "discussion", label: "Discussion", icon: MessageSquare },
              { type: "question", label: "Question", icon: HelpCircle },
              { type: "tip", label: "Astuce", icon: Lightbulb },
            ].map((t) => (
              <Button
                key={t.type}
                size="sm"
                variant={postType === t.type ? "default" : "outline"}
                className="gap-1.5"
                onClick={() => setPostType(t.type)}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </Button>
            ))}
          </div>
          <Textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Partagez une question, une astuce ou démarrez une discussion..."
            rows={3}
            maxLength={2000}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {newPost.length}/2000
            </span>
            <Button
              onClick={createPost}
              disabled={!newPost.trim() || submitting}
              className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white"
            >
              <Send className="h-4 w-4" />
              Publier
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col items-center gap-2 p-6 text-center">
          <LogIn className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour publier et interagir avec la communauté
          </p>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Aucune publication. Soyez le premier à partager !
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const liked = post.likes.some((l) => l.userId === userId);
            const typeColors: Record<string, string> = {
              question: "border-amber-300 bg-amber-50 text-amber-700",
              tip: "border-emerald-300 bg-emerald-50 text-emerald-700",
              discussion: "border-violet-300 bg-violet-50 text-violet-700",
            };
            return (
              <Card key={post.id} className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-xs text-white">
                      {post.author.name?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{post.author.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(post.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={typeColors[post.type] ?? typeColors.discussion}
                  >
                    {post.type === "question"
                      ? "❓ Question"
                      : post.type === "tip"
                        ? "💡 Astuce"
                        : "💬 Discussion"}
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {post.content}
                </p>
                <div className="mt-3 flex items-center gap-4 border-t pt-3">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${
                      liked
                        ? "text-rose-600"
                        : "text-muted-foreground hover:text-rose-600"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                    {post.likesCount}
                  </button>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    {post.comments.length}
                  </span>
                </div>
                {post.comments.length > 0 && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    {post.comments.map((c) => (
                      <div key={c.id} className="flex gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-muted text-[10px]">
                            {c.author.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 rounded-lg bg-muted/40 px-3 py-2">
                          <span className="text-xs font-semibold">
                            {c.author.name}
                          </span>
                          <p className="break-words text-sm">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {session?.user && (
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={commentInputs[post.id] ?? ""}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      placeholder="Écrire un commentaire..."
                      className="h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addComment(post.id);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => addComment(post.id)}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
