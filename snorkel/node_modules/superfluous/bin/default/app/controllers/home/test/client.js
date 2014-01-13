describe("A blank test", function() {
  it("should work", function(done) {
    SF.controller("home", function(ctrl) {
      assert.notEqual(ctrl, null);

      done();
    });
  });
});
