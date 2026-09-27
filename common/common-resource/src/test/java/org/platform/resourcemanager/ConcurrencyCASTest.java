package org.platform.resourcemanager;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.platform.resourcemanager.api.exception.ConcurrencyConflictException;
import org.platform.resourcemanager.domain.builder.ResourceBuilder;
import org.platform.resourcemanager.domain.model.OperationalStatus;
import org.platform.resourcemanager.domain.model.Resource;
import org.platform.resourcemanager.domain.model.ResourceId;

import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class ConcurrencyCASTest {

    @Test
    @DisplayName("Should enforce optimistic locking and throw ConcurrencyConflictException on concurrent update race")
    void shouldEnforceOptimisticLockingOnConcurrentRaces() throws InterruptedException {
        Resource resource = ResourceBuilder.create(ResourceId.of("shopfloor", "LATHE-01"))
                .version(1L)
                .build();

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        long targetExpectedVersion = 1L;

        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    // All threads try to update the resource using the same expectedVersion = 1L
                    OperationalStatus targetStatus = (index % 2 == 0) ? OperationalStatus.BUSY : OperationalStatus.MAINTENANCE;
                    resource.updateStatus(targetStatus, targetExpectedVersion);
                    successCount.incrementAndGet();
                } catch (ConcurrencyConflictException ex) {
                    conflictCount.incrementAndGet();
                } catch (Exception ex) {
                    // unexpected
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown(); // trigger race
        boolean finished = doneLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(finished).isTrue();
        // Exactly ONE thread should have successfully acquired and advanced the CAS version
        assertThat(successCount.get()).isEqualTo(1);
        // The other 9 threads must have encountered ConcurrencyConflictException
        assertThat(conflictCount.get()).isEqualTo(threadCount - 1);
        // Version should now be 2
        assertThat(resource.getVersion()).isEqualTo(2L);
    }
}
