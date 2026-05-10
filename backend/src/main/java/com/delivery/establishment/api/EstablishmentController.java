package com.delivery.establishment.api;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.delivery.establishment.application.EstablishmentService;

import jakarta.validation.Valid;

@RestController
@RequestMapping
public class EstablishmentController {

    private final EstablishmentService establishmentService;

    public EstablishmentController(EstablishmentService establishmentService) {
        this.establishmentService = establishmentService;
    }

    @PostMapping("/api/establishments")
    public ResponseEntity<EstablishmentResponse> create(@Valid @RequestBody CreateEstablishmentRequest request) {
        EstablishmentResponse response = establishmentService.create(request);
        return ResponseEntity.created(URI.create("/api/establishments/" + response.id())).body(response);
    }

    @GetMapping("/api/me/establishments")
    public List<EstablishmentResponse> listMine() {
        return establishmentService.listMine();
    }

    @GetMapping("/api/public/establishments")
    public List<EstablishmentResponse> list() {
        return establishmentService.listAll();
    }
}