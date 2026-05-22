package com.ecocircuit.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/session")
public class SessionController {
    // Simple in-memory single-session store for prototype
    private static final Map<String, Object> STORE = new ConcurrentHashMap<>();

    @GetMapping
    public ResponseEntity<?> getSession() {
        if (STORE.isEmpty()) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(STORE);
    }

    @PostMapping
    public ResponseEntity<?> saveSession(@RequestBody Map<String,Object> payload) {
        STORE.clear();
        STORE.putAll(payload);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping
    public ResponseEntity<?> clearSession() {
        STORE.clear();
        return ResponseEntity.ok().build();
    }
}
