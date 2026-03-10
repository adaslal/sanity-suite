/**
 * Java Parser - Converts Java source code into Step[] flow format
 * Supports Spring Boot, JPA/Hibernate, JDBC, Stream operations, and HTTP clients
 */

// Shape and style mapping for different operation types
const SHAPE_STYLE_MAP = {
  class: { shape: 'subrect', style: 'classNode' },
  dml: { shape: 'stadium', style: 'dmlNode' },
  intent: { shape: 'stadium', style: 'intentNode' },
  event: { shape: 'hexagon', style: 'eventNode' },
  call: { shape: 'rounded', style: 'callNode' },
  fallback: { shape: 'rect', style: 'fallbackNode' },
  end: { shape: 'circle', style: 'endNode' }
};

/**
 * Parse Java code and extract Step array
 * @param {string} javaCode - Java source code
 * @returns {Array<Step>} Array of steps representing code flow
 */
export function parseJavaToSteps(javaCode) {
  const steps = [];
  let stepId = 1;
  let lineNumber = 0;

  // Extract class name
  const classMatch = javaCode.match(/(?:public\s+)?(?:class|interface|enum)\s+(\w+)/);
  const className = classMatch ? classMatch[1] : 'UnknownClass';

  // Add class declaration as first step
  steps.push({
    id: stepId++,
    label: `Class: ${className}`,
    type: 'class',
    shape: SHAPE_STYLE_MAP.class.shape,
    style: SHAPE_STYLE_MAP.class.style,
    source: `class ${className}`,
    editable: false,
    hidden: false
  });

  const lines = javaCode.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    lineNumber = i + 1;

    // Skip empty lines and comments
    if (!line || line.startsWith('//') || line.startsWith('*')) {
      continue;
    }

    // Check for @intent comments
    if (line.includes('@intent')) {
      const intentMatch = line.match(/@intent\s+(.+?)(?:-->|$)/);
      if (intentMatch) {
        steps.push({
          id: stepId++,
          label: intentMatch[1].trim(),
          type: 'intent',
          shape: SHAPE_STYLE_MAP.intent.shape,
          style: SHAPE_STYLE_MAP.intent.style,
          source: line,
          editable: true,
          hidden: false
        });
      }
      continue;
    }

    // Check for method declarations
    if (line.match(/(?:public|private|protected)?\s+\w+\s+\w+\s*\(/)) {
      const methodMatch = line.match(/(\w+)\s*\(/);
      if (methodMatch && methodMatch[1] !== 'if' && methodMatch[1] !== 'for' && methodMatch[1] !== 'while') {
        steps.push({
          id: stepId++,
          label: `Method: ${methodMatch[1]}()`,
          type: 'call',
          shape: SHAPE_STYLE_MAP.call.shape,
          style: SHAPE_STYLE_MAP.call.style,
          source: `${methodMatch[1]}()`,
          editable: false,
          hidden: false
        });
      }
    }

    // JPA/Hibernate operations
    if (/entityManager\.(persist|merge|remove|find|createQuery)/.test(line)) {
      const match = line.match(/entityManager\.(\w+)/);
      if (match) {
        const operation = match[1];
        steps.push({
          id: stepId++,
          label: `JPA: ${operation}()`,
          type: 'dml',
          shape: SHAPE_STYLE_MAP.dml.shape,
          style: SHAPE_STYLE_MAP.dml.style,
          source: `entityManager.${operation}`,
          editable: false,
          hidden: false
        });
      }
    }

    // Spring Data Repository operations
    if (/repository\.(save|saveAll|findAll|findById|deleteById|delete|deleteAll)/.test(line)) {
      const match = line.match(/repository\.(\w+)/);
      if (match) {
        const operation = match[1];
        steps.push({
          id: stepId++,
          label: `Repository: ${operation}()`,
          type: 'dml',
          shape: SHAPE_STYLE_MAP.dml.shape,
          style: SHAPE_STYLE_MAP.dml.style,
          source: `repository.${operation}`,
          editable: false,
          hidden: false
        });
      }
    }

    // JDBC operations
    if (/(?:PreparedStatement|ResultSet|Connection|Statement)/.test(line)) {
      if (/executeQuery|executeUpdate|execute/.test(line)) {
        const match = line.match(/\.(executeQuery|executeUpdate|execute)\s*\(/);
        if (match) {
          steps.push({
            id: stepId++,
            label: `JDBC: ${match[1]}()`,
            type: 'dml',
            shape: SHAPE_STYLE_MAP.dml.shape,
            style: SHAPE_STYLE_MAP.dml.style,
            source: `JDBC.${match[1]}`,
            editable: false,
            hidden: false
          });
        }
      } else {
        const match = line.match(/(?:new\s+)?(PreparedStatement|ResultSet|Connection|Statement)/);
        if (match) {
          steps.push({
            id: stepId++,
            label: `JDBC: ${match[1]}`,
            type: 'dml',
            shape: SHAPE_STYLE_MAP.dml.shape,
            style: SHAPE_STYLE_MAP.dml.style,
            source: `JDBC.${match[1]}`,
            editable: false,
            hidden: false
          });
        }
      }
    }

    // Stream operations
    if (/\.stream\(\)/.test(line)) {
      const streamOps = [];
      if (/\.filter\(/.test(line)) streamOps.push('filter');
      if (/\.map\(/.test(line)) streamOps.push('map');
      if (/\.collect\(/.test(line)) streamOps.push('collect');
      if (/\.forEach\(/.test(line)) streamOps.push('forEach');
      if (/\.reduce\(/.test(line)) streamOps.push('reduce');

      const label = streamOps.length > 0 ? `Stream: ${streamOps.join(', ')}` : 'Stream operation';
      steps.push({
        id: stepId++,
        label: label,
        type: 'call',
        shape: SHAPE_STYLE_MAP.call.shape,
        style: SHAPE_STYLE_MAP.call.style,
        source: line.substring(0, 80),
        editable: false,
        hidden: false
      });
    }

    // HTTP client calls
    if (/(HttpClient|RestTemplate|WebClient|HttpURLConnection)/.test(line)) {
      const match = line.match(/(HttpClient|RestTemplate|WebClient|HttpURLConnection)/);
      if (match) {
        steps.push({
          id: stepId++,
          label: `HTTP: ${match[1]}`,
          type: 'call',
          shape: SHAPE_STYLE_MAP.call.shape,
          style: SHAPE_STYLE_MAP.call.style,
          source: match[1],
          editable: false,
          hidden: false
        });
      }
    }

    // Message queue operations (JMS, Kafka, RabbitMQ)
    if (/(JmsTemplate|KafkaTemplate|RabbitTemplate)/.test(line)) {
      const match = line.match(/(JmsTemplate|KafkaTemplate|RabbitTemplate)/);
      if (match) {
        steps.push({
          id: stepId++,
          label: `Message Queue: ${match[1]}`,
          type: 'event',
          shape: SHAPE_STYLE_MAP.event.shape,
          style: SHAPE_STYLE_MAP.event.style,
          source: match[1],
          editable: false,
          hidden: false
        });
      }
    }

    // Event publishing (ApplicationEventPublisher)
    if (/(ApplicationEventPublisher|publishEvent|@EventListener)/.test(line)) {
      if (/publishEvent/.test(line)) {
        const match = line.match(/publishEvent\s*\(\s*new\s+(\w+)/);
        const eventName = match ? match[1] : 'Event';
        steps.push({
          id: stepId++,
          label: `Event: ${eventName}`,
          type: 'event',
          shape: SHAPE_STYLE_MAP.event.shape,
          style: SHAPE_STYLE_MAP.event.style,
          source: line.substring(0, 80),
          editable: false,
          hidden: false
        });
      }
    }

    // Service method calls (xxxService.doSomething)
    if (/\w+Service\.\w+\s*\(/.test(line)) {
      const match = line.match(/(\w+Service)\.(\w+)\s*\(/);
      if (match) {
        steps.push({
          id: stepId++,
          label: `Call: ${match[1]}.${match[2]}()`,
          type: 'call',
          shape: SHAPE_STYLE_MAP.call.shape,
          style: SHAPE_STYLE_MAP.call.style,
          source: `${match[1]}.${match[2]}`,
          editable: false,
          hidden: false
        });
      }
    }

    // Exception handling (note but typically skip)
    if (/throw\s+new\s+\w+Exception/.test(line)) {
      const match = line.match(/throw\s+new\s+(\w+Exception)/);
      if (match) {
        // Skipping exception throws in main flow but could be tracked
        // steps.push({...})
      }
    }
  }

  // Add end step if there are other steps
  if (steps.length > 1) {
    steps.push({
      id: stepId++,
      label: 'End',
      type: 'end',
      shape: SHAPE_STYLE_MAP.end.shape,
      style: SHAPE_STYLE_MAP.end.style,
      source: 'return',
      editable: false,
      hidden: false
    });
  }

  return steps;
}

/**
 * Get statistics about Java code
 * @param {string} javaCode - Java source code
 * @returns {Object} Statistics object
 */
export function getJavaStats(javaCode) {
  const lines = javaCode.split('\n');
  const classMatch = javaCode.match(/(?:public\s+)?(?:class|interface|enum)\s+(\w+)/);
  const className = classMatch ? classMatch[1] : 'Unknown';

  let codeLines = 0;
  let methodCount = 0;
  let jpaOpsCount = 0;
  let jdbcOpsCount = 0;
  let httpCallCount = 0;
  let streamOpsCount = 0;
  let annotationCount = 0;
  let complexity = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Count non-empty, non-comment lines
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
      codeLines++;
    }

    // Count annotations
    if (trimmed.startsWith('@')) {
      annotationCount++;
      if (/@Transactional|@Async|@Scheduled/.test(trimmed)) {
        complexity++;
      }
    }

    // Count methods
    if (/(?:public|private|protected)?\s+\w+\s+\w+\s*\(/.test(trimmed)) {
      const match = trimmed.match(/(\w+)\s*\(/);
      if (match && match[1] !== 'if' && match[1] !== 'for' && match[1] !== 'while') {
        methodCount++;
      }
    }

    // Count JPA operations
    if (/entityManager\.(persist|merge|remove|find|createQuery)/.test(trimmed)) {
      jpaOpsCount++;
      complexity++;
    }

    // Count JDBC operations
    if (/(PreparedStatement|ResultSet|executeQuery|executeUpdate)/.test(trimmed)) {
      jdbcOpsCount++;
      complexity++;
    }

    // Count HTTP calls
    if (/(HttpClient|RestTemplate|WebClient|HttpURLConnection)/.test(trimmed)) {
      httpCallCount++;
      complexity++;
    }

    // Count stream operations
    if (/\.stream\(\)/.test(trimmed)) {
      streamOpsCount++;
    }

    // Count complexity factors
    if (/if\s*\(|for\s*\(|while\s*\(|switch\s*\(|catch\s*\(/.test(trimmed)) {
      complexity++;
    }
  }

  return {
    className,
    totalLines: lines.length,
    codeLines,
    methods: methodCount,
    methodCount,
    jpaOpsCount,
    jdbcOpsCount,
    httpCallCount,
    streamOpsCount,
    annotationCount,
    complexity
  };
}

/**
 * Sample Java code - Spring Boot OrderService with JPA, REST calls, and event publishing
 */
export const SAMPLE_JAVA = `package com.example.orders.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.client.RestTemplate;
import javax.persistence.EntityManager;
import java.util.*;
import java.util.stream.Collectors;
import com.example.orders.entity.Order;
import com.example.orders.entity.OrderItem;
import com.example.orders.repository.OrderRepository;
import com.example.orders.service.PaymentService;
import com.example.orders.event.OrderCreatedEvent;

/**
 * Service for managing orders with JPA persistence, REST calls, and event publishing
 */
@Service
@Transactional
public class OrderService {

  @Autowired
  private OrderRepository orderRepository;

  @Autowired
  private PaymentService paymentService;

  @Autowired
  private ApplicationEventPublisher eventPublisher;

  @Autowired
  private RestTemplate restTemplate;

  /**
   * Process a new order: save to DB, call payment service, publish event
   * @intent Create order with items and process payment
   */
  public Order processOrder(Order order) {
    // Validate and prepare order
    order.setStatus("PENDING");
    order.setCreatedAt(new Date());

    // Save to database using JPA
    Order savedOrder = orderRepository.save(order);

    // Call external payment service via REST
    PaymentResponse paymentResponse = restTemplate.postForObject(
      "http://payment-service/api/pay",
      new PaymentRequest(savedOrder.getId(), savedOrder.getTotal()),
      PaymentResponse.class
    );

    if (paymentResponse.isSuccess()) {
      savedOrder.setStatus("CONFIRMED");
      orderRepository.save(savedOrder);

      // Publish event
      eventPublisher.publishEvent(
        new OrderCreatedEvent(this, savedOrder.getId(), savedOrder.getCustomerId())
      );
    } else {
      savedOrder.setStatus("FAILED");
      orderRepository.save(savedOrder);
    }

    return savedOrder;
  }

  /**
   * Find orders by customer using repository query
   */
  @Transactional(readOnly = true)
  public List<Order> findOrdersByCustomer(Long customerId) {
    return orderRepository.findByCustomerId(customerId)
      .stream()
      .filter(order -> !order.getStatus().equals("CANCELLED"))
      .map(order -> {
        order.setItemCount(order.getItems().size());
        return order;
      })
      .collect(Collectors.toList());
  }

  /**
   * Cancel an order and notify customer
   * @intent Cancel order and send notification
   */
  public void cancelOrder(Long orderId) {
    Optional<Order> orderOpt = orderRepository.findById(orderId);

    if (orderOpt.isPresent()) {
      Order order = orderOpt.get();
      order.setStatus("CANCELLED");
      order.setCancelledAt(new Date());

      // Delete related items
      order.getItems().forEach(item -> {
        // Item deletion handled by cascade
      });

      // Save cancelled order
      orderRepository.save(order);

      // Notify customer via HTTP call
      try {
        restTemplate.postForObject(
          "http://notification-service/api/notify",
          new NotificationRequest(order.getCustomerId(), "Order cancelled: " + orderId),
          NotificationResponse.class
        );
      } catch (Exception e) {
        // Log error but don't fail
      }
    }
  }

  /**
   * Get order statistics
   */
  public Map<String, Object> getOrderStatistics() {
    List<Order> allOrders = orderRepository.findAll();

    Map<String, Object> stats = new HashMap<>();
    stats.put("totalOrders", allOrders.size());

    stats.put("confirmedOrders", allOrders.stream()
      .filter(o -> "CONFIRMED".equals(o.getStatus()))
      .count()
    );

    stats.put("cancelledOrders", allOrders.stream()
      .filter(o -> "CANCELLED".equals(o.getStatus()))
      .count()
    );

    stats.put("totalRevenue", allOrders.stream()
      .filter(o -> "CONFIRMED".equals(o.getStatus()))
      .mapToDouble(Order::getTotal)
      .sum()
    );

    return stats;
  }

  /**
   * Delete old cancelled orders
   */
  public int cleanupOldCancelledOrders(int daysOld) {
    List<Order> orderToDelete = orderRepository.findAll()
      .stream()
      .filter(o -> "CANCELLED".equals(o.getStatus()))
      .filter(o -> {
        Date cutoff = new Date(System.currentTimeMillis() - (daysOld * 24L * 60L * 60L * 1000L));
        return o.getCancelledAt() != null && o.getCancelledAt().before(cutoff);
      })
      .collect(Collectors.toList());

    orderRepository.deleteAll(orderToDelete);
    return orderToDelete.size();
  }
}

// Supporting classes (simplified)
class PaymentRequest {
  public Long orderId;
  public Double amount;
  public PaymentRequest(Long orderId, Double amount) {
    this.orderId = orderId;
    this.amount = amount;
  }
}

class PaymentResponse {
  public boolean success;
  public String transactionId;
  public boolean isSuccess() { return success; }
}

class NotificationRequest {
  public Long customerId;
  public String message;
  public NotificationRequest(Long customerId, String message) {
    this.customerId = customerId;
    this.message = message;
  }
}

class NotificationResponse {
  public boolean sent;
}
`;

// ES6 exports defined inline above
