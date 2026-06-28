"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ApiDocsView({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>API Documentation</DialogTitle>
          <DialogDescription>Documentation des endpoints publics de l API QuizExam BF</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Endpoints publics</h3>
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex items-center gap-2"><Badge>GET</Badge> <code>/api/public/banks</code> - Liste des banques</div>
              <div className="flex items-center gap-2"><Badge>GET</Badge> <code>/api/public/questions?bankId=X</code> - Questions d une banque</div>
              <div className="flex items-center gap-2"><Badge>GET</Badge> <code>/api/docs</code> - Documentation JSON</div>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Rate limiting</h3>
            <p className="mt-1 text-sm text-muted-foreground">60 requetes par minute par IP sur les endpoints publics.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
