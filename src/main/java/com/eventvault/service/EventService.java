package com.eventvault.service;

import com.eventvault.dto.event.EventRequest;
import com.eventvault.dto.event.EventResponse;
import com.eventvault.entity.Event;
import com.eventvault.exception.ResourceNotFoundException;
import com.eventvault.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;

    @Transactional(readOnly = true)
    public Page<EventResponse> listEvents(Pageable pageable) {
        // Pageable pushes LIMIT/OFFSET down to Postgres instead of loading every
        // row and slicing in Java - the difference matters once there are more
        // than a handful of events.
        return eventRepository.findAll(pageable).map(EventResponse::from);
    }

    @Transactional(readOnly = true)
    public EventResponse getEvent(Long id) {
        return EventResponse.from(findEventOrThrow(id));
    }

    @Transactional
    public EventResponse createEvent(EventRequest request) {
        Event event = Event.builder()
                .name(request.name())
                .description(request.description())
                .venue(request.venue())
                .startTime(request.startTime())
                .totalSeats(request.totalSeats())
                .availableSeats(request.totalSeats())
                .build();
        return EventResponse.from(eventRepository.save(event));
    }

    @Transactional
    public EventResponse updateEvent(Long id, EventRequest request) {
        Event event = findEventOrThrow(id);
        int seatsAlreadyTaken = event.getTotalSeats() - event.getAvailableSeats();

        event.setName(request.name());
        event.setDescription(request.description());
        event.setVenue(request.venue());
        event.setStartTime(request.startTime());
        event.setTotalSeats(request.totalSeats());
        event.setAvailableSeats(Math.max(0, request.totalSeats() - seatsAlreadyTaken));

        return EventResponse.from(event);
    }

    @Transactional
    public void deleteEvent(Long id) {
        if (!eventRepository.existsById(id)) {
            throw new ResourceNotFoundException("Event " + id + " not found");
        }
        eventRepository.deleteById(id);
    }

    private Event findEventOrThrow(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event " + id + " not found"));
    }
}
