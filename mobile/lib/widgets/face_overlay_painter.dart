import 'package:flutter/material.dart';

class FaceOverlayPainter extends CustomPainter {
  final bool faceDetected;
  final bool isLive;

  FaceOverlayPainter({
    required this.faceDetected,
    required this.isLive,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final ovalWidth = size.width * 0.72;
    final ovalHeight = size.height * 0.58;

    // Semi-transparent dark background
    final bgPaint = Paint()
      ..color = Colors.black.withOpacity(0.55)
      ..style = PaintingStyle.fill;

    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
      ..addOval(Rect.fromCenter(center: center, width: ovalWidth, height: ovalHeight))
      ..fillType = PathFillType.evenOdd;

    canvas.drawPath(path, bgPaint);

    // Oval border
    final borderPaint = Paint()
      ..color = faceDetected
          ? (isLive ? const Color(0xFF10B981) : const Color(0xFF0D9488))
          : Colors.white.withOpacity(0.6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0;

    canvas.drawOval(
      Rect.fromCenter(center: center, width: ovalWidth, height: ovalHeight),
      borderPaint,
    );

    // Subtle corner targeting markers
    final markerPaint = Paint()
      ..color = borderPaint.color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4.0
      ..strokeCap = StrokeCap.round;

    final double mLen = 20.0;
    // Top
    canvas.drawLine(Offset(center.dx - mLen, center.dy - ovalHeight / 2), Offset(center.dx + mLen, center.dy - ovalHeight / 2), markerPaint);
    // Bottom
    canvas.drawLine(Offset(center.dx - mLen, center.dy + ovalHeight / 2), Offset(center.dx + mLen, center.dy + ovalHeight / 2), markerPaint);
  }

  @override
  bool shouldRepaint(covariant FaceOverlayPainter oldDelegate) {
    return oldDelegate.faceDetected != faceDetected || oldDelegate.isLive != isLive;
  }
}
